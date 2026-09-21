import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  BookOpen,
  Check,
  CircleQuestionMark,
  Grid2x2,
  Shield,
} from 'lucide-angular';
import { AuthFacade } from '../../../auth/data-access/auth.facade';
import { HybridHeader } from '../../../layout/hybrid-header/hybrid-header';
import { Icon } from '../../../shared/ui/icon/icon';
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
  imports: [ContactForm, HybridHeader, Icon, RouterLink],
  templateUrl: './contact.html',
  styleUrl: './contact.css',
})
export class Contact {
  private readonly authFacade = inject(AuthFacade);
  private readonly contactFacade = inject(ContactFacade);
  private readonly route = inject(ActivatedRoute);

  private readonly form = viewChild(ContactForm);

  protected readonly checkIcon = Check;
  protected readonly guideIcon = BookOpen;
  protected readonly logicIcon = Grid2x2;
  protected readonly faqIcon = CircleQuestionMark;
  protected readonly privacyIcon = Shield;
  protected readonly motifs = CONTACT_MOTIFS;

  protected readonly authenticated = this.authFacade.isAuthenticated;
  protected readonly receipt = this.contactFacade.receipt;
  protected readonly sent = computed(
    () => this.contactFacade.status() === 'sent',
  );
  protected readonly homeLink = computed(() =>
    this.authenticated() ? '/dashboard' : '/',
  );
  protected readonly homeLabel = computed(() =>
    this.authenticated() ? "Retour à l'accueil" : 'Retour au site',
  );

  protected readonly motif = signal<ContactMotif>(this.requestedMotif());

  constructor() {
    this.contactFacade.reset();
  }

  protected sendAnother(): void {
    this.form()?.reset();
    this.contactFacade.startAnother();
  }

  private requestedMotif(): ContactMotif {
    const requested = this.route.snapshot.queryParamMap.get(
      CONTACT_MOTIF_QUERY_PARAM,
    );
    return isContactMotif(requested) ? requested : DEFAULT_CONTACT_MOTIF;
  }
}
