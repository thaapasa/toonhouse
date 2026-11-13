const texts = {
  en: {
    title: 'Toonhouse motion prototypes',
    link2d: '2D: cutout with rubber-hose limbs',
    link3d: '3D: toon-shaded ready-made character',
    play: 'Play',
    pause: 'Pause',
    stepBack: 'One frame back',
    stepForward: 'One frame forward',
    scrub: 'Time',
    back: 'Back to the list',
  },
  fi: {
    title: 'Toonhousen liikeprototyypit',
    link2d: '2D: leikkeet ja kumiletkuraajat',
    link3d: '3D: valmis hahmo sarjakuvavarjostuksella',
    play: 'Toista',
    pause: 'Tauko',
    stepBack: 'Ruutu taaksepäin',
    stepForward: 'Ruutu eteenpäin',
    scrub: 'Aika',
    back: 'Takaisin listaan',
  },
} as const;

export type TextKey = keyof (typeof texts)['en'];

const lang = navigator.language.toLowerCase().startsWith('fi') ? 'fi' : 'en';

export function tr(key: TextKey): string {
  return texts[lang][key];
}
