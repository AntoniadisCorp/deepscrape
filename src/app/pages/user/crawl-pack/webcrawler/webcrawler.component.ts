import { NgIf } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CrawlConfig } from 'src/app/core/types';

@Component({
  selector: 'app-webcrawler',
  standalone: true,
  imports: [ReactiveFormsModule, NgIf,],
  templateUrl: './webcrawler.component.html',
  styleUrl: './webcrawler.component.scss'
})
export class WebCrawlerComponent {

}
