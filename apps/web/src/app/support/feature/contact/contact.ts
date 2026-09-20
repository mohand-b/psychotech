import {
  ChangeDetectionStrategy,
  Component,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  ArrowLeft,
  BookOpen,
  Check,
  CircleQuestionMark,
  Grid2x2,
  Shield,
} from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { EnergyFacade } from '../../../energy/data-access/energy.facade';
import { Icon } from '../../../shared/ui/icon/icon';
import { Navbar } from '../../../shared/ui/navbar/navbar';
import {
  CONTACT_MOTIF_QUERY_PARAM,
  ContactMotif,
} from '../../../shared/util/contact-link';
import { ContactFacade } from '../../data-access/contact.facade';
import {
  CONTACT_MOTIFS,
  DEFAULT_CONTACT_MOTIF,
  isContactMotif,
} from '../../ui/contact-presentation';
import { ContactForm } from '../contact-form/contact-form';

@Component({
  selector: 'app-contact',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ContactForm, Icon, Navbar, RouterLink],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  private readonly authFacade = inject(AuthFacade);
  private readonly energyFacade = inject(EnergyFacade);
  private readonly contactFacade = inject(ContactFacade);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly form = viewChild(ContactForm);

  protected readonly backIcon = ArrowLeft;
  protected readonly checkIcon = Check;
  protected readonly guideIcon = BookOpen;
  protected readonly logicIcon = Grid2x2;
  protected readonly faqIcon = CircleQuestionMark;
  protected readonly privacyIcon = Shield;
  protected readonly motifs = CONTACT_MOTIFS;

  protected readonly authenticated = this.authFacade.isAuthenticated;
  protected readonly user = this.authFacade.currentUser;
  protected readonly energy = this.energyFacade.state;
  protected readonly receipt = this.contactFacade.receipt;
  protected readonly sent = computed(
    () => this.contactFacade.status() === 'sent',
  );
  protected readonly homeLink = computed(() =>
    this.authenticated() ? '/dashboard' : '/',
  );
  protected readonly mobileBackLink = computed(() =>
    this.authenticated() ? '/profil' : '/',
  );
  protected readonly homeLabel = computed(() =>
    this.authenticated() ? "Retour à l'accueil" : 'Retour au site',
  );

  protected readonly motif = signal<ContactMotif>(this.requestedMotif());

  constructor() {
    this.contactFacade.reset();
    afterNextRender(() => {
      if (this.authenticated() && this.energy() === null) {
        this.energyFacade.load().subscribe();
      }
    });
  }

  protected sendAnother(): void {
    this.form()?.reset();
    this.contactFacade.startAnother();
  }

  protected logout(): void {
    this.authFacade.logout().subscribe({
      next: () => this.router.navigate(['/login']),
      error: () => this.router.navigate(['/login']),
    });
  }

  private requestedMotif(): ContactMotif {
    const requested = this.route.snapshot.queryParamMap.get(
      CONTACT_MOTIF_QUERY_PARAM,
    );
    return isContactMotif(requested) ? requested : DEFAULT_CONTACT_MOTIF;
  }
}
