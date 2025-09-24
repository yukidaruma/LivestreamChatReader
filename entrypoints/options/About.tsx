import { MarkdownRenderer } from './markdown';
import rawChangelog from '../../CHANGELOG.md?raw';
import { PROJECT_URL_OBJECT, t } from '@extension/shared';
import { IconButton, icons } from '@extension/ui';

const About = () => {
  const changelog = rawChangelog.replace(/^# Changelog/, '').trim();

  const version = browser.runtime.getManifest().version;

  return (
    <div className="space-y-6">
      <h1 className="mb-6 text-2xl font-bold">{t('about', t('extensionNameShort'))}</h1>

      <div>
        <h2>{t('version')}</h2>
        <p className="text-secondary">
          {t('extensionNameShort')} v{version}
        </p>
      </div>

      <div>
        <h2>{t('tips')}</h2>
        <ul>
          <li>
            {t('aboutTipKeyboardShortcut')}
            <ul>
              <li>
                {t('aboutTipKeyboardShortcutLink')} <code>chrome://extensions/shortcuts</code>
              </li>
            </ul>
          </li>
        </ul>
      </div>

      <div>
        <h2>{t('changelog')}</h2>
        <div className="bg-secondary border-primary max-h-60 w-full max-w-none! overflow-y-scroll rounded border p-3 text-sm whitespace-pre-wrap">
          <MarkdownRenderer className="space-y-4 [&_*+h2]:mt-6" markdown={changelog} />
        </div>
      </div>

      <div>
        <h2>{t('contacts')}</h2>
        <div className="space-x-2">
          <IconButton
            icon={icons.Chrome}
            href={`https://chromewebstore.google.com/detail/${browser.runtime.id}`}
            target="_blank"
            title={t('openPage', t('chromeWebStore'))}
            aria-label={t('chromeWebStore')}
          />
          <IconButton
            icon={icons.Github}
            href={PROJECT_URL_OBJECT.url}
            target="_blank"
            title={t('openPage', t('githubRepository'))}
            aria-label={t('githubRepository')}
          />
          <IconButton
            icon={icons.X}
            href={PROJECT_URL_OBJECT.x}
            target="_blank"
            title={t('openPage', t('xProfile'))}
            aria-label={t('xProfile')}
          />
        </div>
      </div>

      <hr />
      <p>
        Made with <span className="text-[#80bfff]">❄</span> by{' '}
        <a href="https://yuki.games" className="hover:text-gray-50 hover:underline" target="_blank">
          yuki.games
        </a>
        .
      </p>
    </div>
  );
};

export default About;
