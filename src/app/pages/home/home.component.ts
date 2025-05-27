import { Component, OnInit, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, NgClass, NgIf } from '@angular/common';
import { ThemeToggleComponent } from 'src/app/shared';
import { MatIcon } from '@angular/material/icon';
import { FeaturesComponent, HeroComponent } from 'src/app/layout/landpage';

@Component({
  selector: 'app-home',
  imports: [RouterLink, ThemeToggleComponent, HeroComponent, FeaturesComponent, NgClass],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 100; // Update the state based on scroll position
  }
  isDarkMode = false;
  isScrolled = false; // New property to track scroll state

  constructor() { }

  ngOnInit() {
    // Check initial system preference or saved preference
  }

}
