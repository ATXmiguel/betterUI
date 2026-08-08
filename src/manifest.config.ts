import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'betterUI para SIGAA (não-oficial)',
  version: '0.1.0',
  description: 'Reorganiza a interface do SIGAA. Extensão não-oficial, sem vínculo com o CEFET-MG.',
  permissions: ['storage'],
  content_scripts: [
    {
      matches: ['https://sig.cefetmg.br/sigaa/*'],
      js: ['src/content/index.ts'],
      run_at: 'document_idle',
    },
  ],
  action: {
    default_title: 'betterUI para SIGAA (não-oficial)',
  },
});
