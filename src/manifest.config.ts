import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'betterUI para SIGAA (não-oficial)',
  version: '0.1.2',
  description: 'Reorganiza a interface do SIGAA. Extensão não-oficial, sem vínculo com o CEFET-MG.',
  permissions: ['storage'],
  icons: {
    16: 'public/icon-16.png',
    32: 'public/icon-32.png',
    48: 'public/icon-48.png',
    128: 'public/icon-128.png',
  },
  content_scripts: [
    {
      matches: ['https://sig.cefetmg.br/sigaa/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  action: {
    default_title: 'betterUI para SIGAA (não-oficial)',
    default_icon: {
      16: 'public/icon-16.png',
      32: 'public/icon-32.png',
      48: 'public/icon-48.png',
      128: 'public/icon-128.png',
    },
  },
});
