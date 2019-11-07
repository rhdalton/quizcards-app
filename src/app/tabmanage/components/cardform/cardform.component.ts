import { Component, OnInit, AfterViewChecked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Card } from 'src/app/models/card';
import { AppSettings } from 'src/app/models/appsettings';
import { AppdataClass } from 'src/app/shared/classes/appdata';
import { ActionSheetController } from '@ionic/angular';
import { Camera } from '@ionic-native/Camera/ngx';
import { SqliteService } from 'src/app/services/sqlite.service';
import * as uuid from 'uuid';
import { ImageService } from 'src/app/services/images.service';
import { Achievements } from 'src/app/shared/classes/achievements';

@Component({
  selector: 'app-cardform',
  templateUrl: './cardform.component.html',
  styleUrls: ['./cardform.component.scss'],
})
export class CardformComponent implements OnInit, AfterViewChecked {
  _quizId: string;
  _cardId: string;
  _addBefore: string;
  _apps: AppSettings;
  _tempImage: string;
  advFields = false;
  isPro = false;
  Card: Card;
  cardheader: string;
  errorMsg: string;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private sqlite: SqliteService,
    private app: AppdataClass,
    private actionSheet: ActionSheetController,
    private camera: Camera,
    private images: ImageService,
    private ach: Achievements
  ) {
    this._quizId = this.route.snapshot.params.quizid;
    this._cardId = this.route.snapshot.params.cardid;
    this._addBefore = this.route.snapshot.params.addbefore;

    this._tempImage = '';
    this.errorMsg = '';

    if (!this._cardId || this._cardId === '0') {
      this.Card = {
        id: '',
        quiz_id: this._quizId,
        c_text: '',
        c_subtext: '',
        c_image: '',
        image_path: '',
        c_audio: '',
        audio_path: '',
        c_video: '',
        c_correct: '',
        c_study: '',
        c_substudy: '',
        cardorder: 0,
        correct_count: 0
      };
      this.cardheader = 'Add Card';
      if (this._addBefore) this.cardheader += ' (before card #' + (parseInt(this._addBefore) + 1) + ')';
    } else {
      this.cardheader = 'Edit Card';
    }
  }

  async ngOnInit() {
    this._apps = await this.app.getAppSettings();

    if (this._quizId && this._cardId && this._cardId !== '0') {
      this.Card = await this.sqlite.getQuizCard(this._cardId, this._quizId);
      this._tempImage = this.Card.image_path;
    }
    this.isPro = this.app.isPro(this._apps.userStatus);
  }

  ngAfterViewChecked() {
    this.resize('c_text');
    this.resize('c_correct');
  }

  async save(f) {

    if (this.Card.c_text.trim() === '' && this.Card.c_image.trim() === '') this.errorMsg = 'Card text or an Image is required.';
    else if (this.Card.c_correct.trim() === '') this.errorMsg = 'An answer is required.';
    else this.errorMsg = '';

    if (this.errorMsg !== '') return;

    this.Card.c_study = this.Card.c_correct;

    if (this._cardId && this._cardId !== '0') {
      // updating card
      await this.sqlite.updateCard(this.Card);
      this.ach.updateLocalAchievement(14, 1);
    } else {
      // saving new card
      this.Card.id = uuid.v1();
      if (this._addBefore) await this.sqlite.addCards([this.Card], true, parseInt(this._addBefore));
      else await this.sqlite.addCards([this.Card], true);
      this.ach.updateLocalAchievement(11, 1);
    }

    this.router.navigate(['/tabs/tabmanage/cards', this._quizId]);
  }

  selectAudioFile() {
    
  }

  async showImageActionSheet() {
    this.actionSheet.create({
      header: 'Select Image Source',
      buttons: [
        {
          text: 'Choose from Gallery',
          handler: () => { this.takePicture(this.camera.PictureSourceType.PHOTOLIBRARY); }
        },
        {
          text: 'Use Camera',
          handler: () => { this.takePicture(this.camera.PictureSourceType.CAMERA); }
        },
        {
          text: 'Cancel', role: 'cancel'
        }
      ]
    }).then(as => as.present());
  }

  async takePicture(src) {
    const newFile = await this.images.takePicture(src);
    if (newFile) {
      if (this._tempImage !== '') await this.removeImage();
      this.Card.c_image = newFile.c_image;
      this._tempImage = newFile.image_path;
    }
  }

  async removeImage() {
    await this.images.deleteImage(this._tempImage);
    this._tempImage = '';
    this.Card.c_image = '';
  }

  toggleAdvFields() {
    this.advFields = !this.advFields;
  }

  resize(id) {
    const el = (document.getElementById(id) as HTMLInputElement);
    if (el && el.value !== '') {
      document.getElementById(id).style.height = 'auto';
      document.getElementById(id).style.height = (document.getElementById(id).scrollHeight + 2) + 'px';
      console.log('sd');
    }
  }
}
