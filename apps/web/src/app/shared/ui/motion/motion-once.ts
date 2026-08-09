import {
  Directive,
  ElementRef,
  Injectable,
  OnInit,
  inject,
  input,
} from '@angular/core';

@Injectable({ providedIn: 'root' })
export class MotionOnceRegistry {
  private readonly played = new Set<string>();

  claim(key: string): boolean {
    if (this.played.has(key)) {
      return false;
    }
    this.played.add(key);
    return true;
  }

  hasPlayed(key: string): boolean {
    return this.played.has(key);
  }
}

@Directive({ selector: '[uiMotionOnce]' })
export class MotionOnce implements OnInit {
  readonly uiMotionOnce = input.required<string>();

  private readonly registry = inject(MotionOnceRegistry);
  private readonly element =
    inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  ngOnInit(): void {
    const key = this.uiMotionOnce();
    const alreadyPlayed = this.registry.hasPlayed(key);
    if (alreadyPlayed) {
      this.element.classList.add('motion-off');
    } else {
      this.registry.claim(key);
    }
  }
}
