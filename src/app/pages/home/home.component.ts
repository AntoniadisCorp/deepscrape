import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, NgIf } from '@angular/common';
import { ThemeToggleComponent } from 'src/app/shared';

@Component({
    selector: 'app-home',
    imports: [RouterLink, ThemeToggleComponent],
    templateUrl: './home.component.html',
    styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  isDarkMode = false;

  constructor() { }

  ngOnInit() {
    // Check initial system preference or saved preference
  }


}
