import {
  LitElement,
  css,
  html,
  customElement,
  property,
  internalProperty,
} from 'lit-element';
import { RawTestResult, ScoreEvent } from '../utils/interfaces';

import {
  largeBreakPoint,
  xLargeBreakPoint,
  xxLargeBreakPoint,
  xxxLargeBreakPoint,
  mediumBreakPoint,
  smallBreakPoint,
} from '../utils/css/breakpoints';

import './score-results';
import '../components/app-button';
import { baseOrPublish, getURL } from '../services/app-info';
import { Router } from '@vaadin/router';
import { getOverallScore } from '../services/tests';
import { getPossibleBadges, sortBadges } from '../services/badges';

import { classMap } from 'lit-html/directives/class-map';
import { styleMap } from 'lit-html/directives/style-map';

@customElement('report-card')
export class ReportCard extends LitElement {
  @property() results: RawTestResult | undefined;
  @property() scoreCardResults: RawTestResult | undefined;

  @internalProperty() maniScore = 0;
  @internalProperty() swScore = 0;
  @internalProperty() securityScore = 0;
  @internalProperty() overallScore = 0;

  @internalProperty() currentURL: string | undefined;

  @internalProperty() pwa_icon: { url: string; locked: boolean } | undefined;
  @internalProperty() manifest_icon:
    | { url: string; locked: boolean }
    | undefined;
  @internalProperty() sw_icon: { url: string; locked: boolean } | undefined;
  @internalProperty() security_icon:
    | { url: string; locked: boolean }
    | undefined;

  maxManiScore = 80;
  maxSWSCore = 20;
  maxSecurityScore = 15;

  static get styles() {
    return css`
      :host {
        width: 100%;
        display: block;
      }

      #main-report-section {
        padding-left: 18px;
        padding-right: 32px;
        padding-bottom: 32px;
      }

      #report-content {
        --neutral-foreground-hover: black;
      }

      .accordion-heading-block {
        width: 76vw;
        display: flex;
        align-items: center;
        justify-content: space-between;

        color: var(--font-color);
      }

      h3,
      .accordion-heading,
      .accordion-score,
      #overall-score {
        font-size: var(--medium-font-size);
        font-weight: var(--font-bold);
      }

      .accordion-score {
        margin-right: 20px;
      }

      fast-accordion-item,
      fast-accordion {
        --neutral-divider-rest: #e5e5e5;
      }

      fast-accordion {
        border-top: none;
      }

      fast-accordion-item::part(icon) {
        display: none;
      }

      fast-accordion-item::part(button) {
        height: 6em;
        width: 70vw;
      }

      .flipper-button {
        background: white;
        box-shadow: 0 1px 4px 0px rgb(0 0 0 / 25%);
        border-radius: 50%;
        color: #5231a7;

        height: 32px;
        min-width: 32px;
      }

      .flipper-button ion-icon {
        pointer-events: none;
      }

      .flipper-button ion-icon {
        pointer-events: none;
      }

      .flipper-button::part(control) {
        font-size: 18px;
        padding: 0;
      }

      .flipper-button::part(content) {
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .score-block {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-right: 1.2em;
      }

      .options-button {
        width: 217px;

        margin-top: 33px;
        margin-bottom: 33px;
      }

      .options-button::part(underlying-button) {
        background: white;
        color: var(--font-color);
      }

      #total-score {
        display: flex;
        flex-direction: column;
        align-items: initial;
        justify-content: initial;

        margin-right: 1.4em;
      }

      #total-score h4 {
        font-size: var(--medium-font-size);
      }

      #package-block {
        display: flex;
        justify-content: flex-end;
        margin-top: 40px;
      }

      #package-block fast-anchor {
        width: 152px;
        color: white;
        box-shadow: var(--button-shadow);
        border-radius: var(--button-radius);
      }

      #total-score-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      #total-score-header h4 {
        font-size: var(--medium-font-size);
      }

      #badge-section {
        display: flex;
        align-items: center;
        margin-top: -18px;
      }

      #badge-section img {
        margin-right: 10px;
        width: 60px;
      }

      #badge-text h4 {
        font-size: var(--small-font-size);
        margin-bottom: 0;
        margin-top: 0;
      }

      #badge-text p {
        font-size: var(--small-font-size);
        font-weight: normal;
        margin-top: 0;
        margin-bottom: 0;
      }

      .locked {
        opacity: 0.5;
      }

      ${
        xxxLargeBreakPoint(
          css`
            .accordion-heading-block {
              width: 111em;
            }
          `
        )
      }

      ${xxLargeBreakPoint(
        css`
          .accordion-heading-block {
            max-width: 85vw;
            width: 85vw;
          }

          #total-score {
            margin-right: 1.2em;
          }
        `
      )}

      ${xLargeBreakPoint(
        css`
          .accordion-heading-block,
          #report-content {
            width: 80vw;
          }

          #total-score {
            width: 75vw;
          }
        `
      )}

      ${largeBreakPoint(
        css`
          .accordion-heading-block {
            width: 90vw;
          }
        `
      )}

      ${mediumBreakPoint(
        css`
          .accordion-heading-block {
            width: 90vw;
          }

          #package-block {
            justify-content: center;
            margin-bottom: 40px;
          }
        `
      )}

      ${smallBreakPoint(
        css`
          #main-report-section {
            padding-left: 12px;
            padding-right: 12px;
          }

          .accordion-heading-block {
            width: 90vw;
          }

          #package-block {
            justify-content: center;
            margin-bottom: 40px;
          }
        `
      )}
    `;
  }

  constructor() {
    super();
  }

  async firstUpdated() {
    if (!this.results) {
      // Should never really end up here
      // But just in case this component tries to render without results
      // lets attempt to grab the last saved results
      try {
        this.scoreCardResults = await this.handleNoResults();
      } catch (err) {
        throw new Error(`Error handling results: ${err}`);
      }
    } else {
      this.scoreCardResults = this.results;
    }

    const urlData = getURL();

    if (urlData) {
      this.currentURL = urlData;
    }

    this.overallScore = getOverallScore();

    await this.handleBadges();

    console.log('pwa icon', this.pwa_icon);
  }

  async handleBadges() {
    const possible_badges = getPossibleBadges();
    const achievedBadges = sortBadges();
    console.log('currentBadges', achievedBadges);

    if (possible_badges) {
      possible_badges.forEach(badge => {
        console.log('badge', badge.name);
        if (badge.name === 'PWA') {
          console.log('chosen', badge);
          this.pwa_icon = {
            url: badge.url,
            locked: achievedBadges.find(dupe => {
              return badge.name === dupe.name;
            })
              ? false
              : true,
          };
          return;
        } else if (badge.name === 'Manifest') {
          this.manifest_icon = {
            url: badge.url,
            locked: achievedBadges.find(dupe => {
              return badge.name === dupe.name;
            })
              ? false
              : true,
          };
          return;
        } else if (badge.name === 'Service Worker') {
          this.sw_icon = {
            url: badge.url,
            locked: achievedBadges.find(dupe => {
              return badge.name === dupe.name;
            })
              ? false
              : true,
          };
        } else if (badge.name === 'Security') {
          this.security_icon = {
            url: badge.url,
            locked: achievedBadges.find(dupe => {
              return badge.name === dupe.name;
            })
              ? false
              : true,
          };
        }
      });
    } else {
      return undefined;
    }
  }

  async handleNoResults(): Promise<RawTestResult> {
    return new Promise((resolve, reject) => {
      const rawResultsData = sessionStorage.getItem('results-string');

      if (rawResultsData) {
        const resultsData = JSON.parse(rawResultsData);

        if (resultsData) {
          resolve(resultsData);
        }
      } else {
        reject(new Error('No results passed'));
      }
    });
  }

  opened(targetEl: EventTarget | null) {
    console.log(targetEl);

    if (targetEl) {
      const flipperButton = (targetEl as Element).classList.contains(
        'flipper-button'
      )
        ? (targetEl as Element)
        : (targetEl as Element).querySelector('.flipper-button');

      if (flipperButton) {
        if (flipperButton.classList.contains('opened')) {
          flipperButton.animate(
            [
              {
                transform: 'rotate(0deg)',
              },
            ],
            {
              duration: 200,
              fill: 'forwards',
            }
          );

          flipperButton.classList.remove('opened');
        } else {
          flipperButton.classList.add('opened');

          flipperButton.animate(
            [
              {
                transform: 'rotate(0deg)',
              },
              {
                transform: 'rotate(90deg)',
              },
            ],
            {
              duration: 200,
              fill: 'forwards',
            }
          );
        }
      }
    }
  }

  handleManiScore(ev: CustomEvent) {
    this.maniScore = ev?.detail?.score || 0;

    const event = new CustomEvent<ScoreEvent>('mani-scored', {
      detail: {
        score: this.maniScore,
      },
    });
    this.dispatchEvent(event);
  }

  handleSWScore(ev: CustomEvent) {
    this.swScore = ev?.detail?.score || 0;

    const event = new CustomEvent<ScoreEvent>('sw-scored', {
      detail: {
        score: this.swScore,
      },
    });
    this.dispatchEvent(event);
  }

  handleSecurityScore(ev: CustomEvent) {
    this.securityScore = ev?.detail?.score || 0;

    const event = new CustomEvent<ScoreEvent>('security-scored', {
      detail: {
        score: this.securityScore,
      },
    });
    this.dispatchEvent(event);
  }

  openManiOptions() {
    const event = new CustomEvent('open-mani-options', {
      detail: {
        open: true,
      },
    });
    this.dispatchEvent(event);
  }

  openSWOptions() {
    const event = new CustomEvent('open-sw-options', {
      detail: {
        open: true,
      },
    });
    this.dispatchEvent(event);
  }

  decideWhereToGo() {
    const baseOrPublishIffy = baseOrPublish();

    if (baseOrPublishIffy === 'base') {
      Router.go('/basepackage');
    } else if (baseOrPublishIffy === 'publish') {
      Router.go(`/publish?site=${this.currentURL}`);
    } else {
      Router.go('/basepackage');
    }
  }

  decideScoreColor(score: number, locked?: boolean) {
    if (score === 0) {
      return 'var(--error-color)';
    } else if (locked) {
      return 'var(--warning-color)';
    } else {
      return 'var(--success-color)';
    }
  }

  render() {
    return html`
      <div id="main-report-section">
        <div id="report-content">
          <fast-accordion>
            <fast-accordion-item
              @click="${(ev: Event) => this.opened(ev.target)}"
            >
              <div class="accordion-heading-block" slot="heading">
                <span class="accordion-heading">Manifest</span>

                <div class="score-block">
                  <span
                    class="accordion-score"
                    style=${styleMap({
                      color: this.decideScoreColor(
                        this.maniScore,
                        this.manifest_icon?.locked
                      ),
                    })}
                    >${this.maniScore}</span
                  >

                  <fast-button class="flipper-button" mode="stealth">
                    <ion-icon name="caret-forward-outline"></ion-icon>
                  </fast-button>
                </div>
              </div>

              ${this.manifest_icon
                ? html`<div id="badge-section">
                    <img
                      class="${classMap({
                        locked: this.manifest_icon.locked,
                      })}"
                      src="${this.manifest_icon.url}"
                    />

                    <div id="badge-text">
                      ${this.manifest_icon.locked
                        ? html`<h4>
                            Uh oh, your Manifest needs more work before this
                            badge is unlocked
                          </h4>`
                        : html`<h4>You have unlocked the Manifest Badge!</h4>`}
                    </div>
                  </div>`
                : null}
              ${this.scoreCardResults
                ? html`<score-results
                    .testResults="${this.scoreCardResults.manifest}"
                    @scored="${(ev: CustomEvent) => this.handleManiScore(ev)}"
                  >
                    <app-button
                      @click="${() => this.openManiOptions()}"
                      class="options-button"
                      slot="options-button"
                      >Manifest Options</app-button
                    >
                  </score-results>`
                : null}
            </fast-accordion-item>
            <fast-accordion-item
              @click="${(ev: Event) => this.opened(ev.target)}"
            >
              <div class="accordion-heading-block" slot="heading">
                <span class="accordion-heading">Service Worker</span>

                <div class="score-block">
                  <span
                    style=${styleMap({
                      color: this.decideScoreColor(
                        this.swScore,
                        this.sw_icon?.locked
                      ),
                    })}
                    class="accordion-score"
                    >${this.swScore}</span
                  >

                  <fast-button class="flipper-button" mode="stealth">
                    <ion-icon name="caret-forward-outline"></ion-icon>
                  </fast-button>
                </div>
              </div>

              ${this.sw_icon
                ? html`<div id="badge-section">
                    <img
                      class="${classMap({
                        locked: this.sw_icon.locked,
                      })}"
                      src="${this.sw_icon.url}"
                    />

                    <div id="badge-text">
                      ${this.sw_icon.locked
                        ? html`<h4>
                            Uh oh, your Service Worker needs more work before
                            this badge is unlocked
                          </h4>`
                        : html`<h4>
                            You have unlocked the Service Worker Badge!
                          </h4>`}
                    </div>
                  </div>`
                : null}
              ${this.scoreCardResults
                ? html`<score-results
                    .testResults="${this.scoreCardResults.service_worker}"
                    @scored="${(ev: CustomEvent) => this.handleSWScore(ev)}"
                  >
                    <app-button
                      @click="${() => this.openSWOptions()}"
                      slot="options-button"
                      class="options-button"
                      >Service Worker Options</app-button
                    >
                  </score-results>`
                : null}
            </fast-accordion-item>
            <fast-accordion-item
              @click="${(ev: Event) => this.opened(ev.target)}"
            >
              <div class="accordion-heading-block" slot="heading">
                <span class="accordion-heading">Security</span>

                <div class="score-block">
                  <span
                    style=${styleMap({
                      color: this.decideScoreColor(
                        this.securityScore,
                        this.security_icon?.locked
                      ),
                    })}
                    class="accordion-score"
                    >${this.securityScore}</span
                  >

                  <fast-button class="flipper-button" mode="stealth">
                    <ion-icon name="caret-forward-outline"></ion-icon>
                  </fast-button>
                </div>
              </div>

              ${this.security_icon
                ? html`<div id="badge-section">
                    <img
                      class="${classMap({
                        locked: this.security_icon.locked,
                      })}"
                      src="${this.security_icon.url}"
                    />

                    <div id="badge-text">
                      ${this.security_icon.locked
                        ? html`<h4>
                            Uh oh, your Security needs more work before this
                            badge is unlocked
                          </h4>`
                        : html`<h4>You have unlocked the Security Badge!</h4>`}
                    </div>
                  </div>`
                : null}
              ${this.scoreCardResults
                ? html`<score-results
                    .testResults="${this.scoreCardResults.security}"
                    @scored="${(ev: CustomEvent) =>
                      this.handleSecurityScore(ev)}"
                  ></score-results>`
                : null}
            </fast-accordion-item>
          </fast-accordion>
        </div>

        <div id="overall-score">
          <div id="total-score">
            <div id="total-score-header">
              <h4>Total Score</h4>
              <span
                style=${styleMap({
                  color: this.decideScoreColor(
                    this.overallScore,
                    this.pwa_icon?.locked
                  ),
                })}
                id="overall-score"
                >${this.overallScore}</span
              >
            </div>

            ${this.pwa_icon
              ? html`<div id="badge-section">
                  <img
                    class="${classMap({
                      locked: this.pwa_icon.locked,
                    })}"
                    src="${this.pwa_icon.url}"
                  />

                  <div id="badge-text">
                    ${this.pwa_icon.locked === false
                      ? html`<h4>Congrats!</h4>
                          <p>You have a great PWA!</p>`
                      : html`
                          <h4>Uh Oh</h4>
                          <p>
                            Your PWA needs more work, look above for details.
                          </p>
                        `}
                  </div>
                </div>`
              : null}
          </div>

          <div id="package-block">
            <app-button @click="${() => this.decideWhereToGo()}"
              >Next</app-button
            >
          </div>
        </div>
      </div>
    `;
  }
}
