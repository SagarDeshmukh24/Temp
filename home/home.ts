import { Component } from '@angular/core';
import { ContactForm } from '../contact-form/contact-form';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  imports: [ContactForm, RouterModule],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {

}
