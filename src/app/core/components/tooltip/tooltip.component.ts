import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TooltipPosition } from '../../enum';

@Component({
  selector: 'tooltip',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './tooltip.component.html',
  styleUrl: './tooltip.component.scss'
})
export class TooltipComponent {
  tooltip: string = '';
  left: number = 0;
  top: number = 0;
  position: string = TooltipPosition.DEFAULT;
  visible: boolean = false


  constructor() { }

  ngOnInit(): void { }
}
