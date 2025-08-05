import '@src/Options.css';
import { t } from '@extension/i18n';
import { supportedLanguages } from '@extension/i18n/lib/types';
import {
  PROJECT_URL_OBJECT,
  useDebounce,
  useStorage,
  useSubscribeIcon,
  withErrorBoundary,
  withSuspense,
} from '@extension/shared';
import { DEFAULT_SPEECH_TEMPLATE, speakText } from '@extension/shared/lib/utils';
import {
  exampleThemeStorage,
  extensionEnabledStorage,
  languageStorage,
  speechTemplateStorage,
  ttsVoiceEngineStorage,
  ttsVolumeStorage,
} from '@extension/storage';
import { cn, ErrorDisplay, getIconColor, LoadingSpinner, ToggleButton } from '@extension/ui';
import * as icons from '@extension/ui/lib/icons';
import { useEffect, useMemo, useRef, useState } from 'react';

// Valid field names that can be used in speech templates
const VALID_FIELD_NAMES = ['name', 'body'];

const validateSpeechTemplate = (template: string): string[] | null => {
  const fieldNameMatches = template.match(/%\((\w*)\)/g);

  if (!fieldNameMatches) {
    return null;
  }

  const extractedFieldNames = fieldNameMatches.map(match => match.replace(/%\((\w*)\)/, '$1'));

  const invalidFieldNames = [...new Set(extractedFieldNames)].filter(name => !VALID_FIELD_NAMES.includes(name));

  return invalidFieldNames.length > 0 ? invalidFieldNames : null;
};

const Options = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const { enabled } = useStorage(extensionEnabledStorage);
  const { language } = useStorage(languageStorage);
  const { template: speechTemplate } = useStorage(speechTemplateStorage);
  const { volume: storedVolume } = useStorage(ttsVolumeStorage);
  const { uri: voiceURI } = useStorage(ttsVoiceEngineStorage);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [localVolume, setLocalVolume] = useState(storedVolume);
  const [localSpeechTemplate, setLocalSpeechTemplate] = useState(speechTemplate ?? '');
  const [isTestingVoice, setIsTestingVoice] = useState(false);
  const currentVolumeRef = useRef(storedVolume);
  const cancelTestSpeechRef = useRef<(() => void) | null>(null);

  const invalidFieldNames = useMemo(() => validateSpeechTemplate(localSpeechTemplate), [localSpeechTemplate]);

  // Check if we're in inline mode (embedded in iframe)
  const isInline = new URLSearchParams(window.location.search).has('inline');

  const iconColor = getIconColor(isLight);

  useSubscribeIcon();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    languageStorage.setLanguage(event.target.value);
  };

  const debouncedVolumeUpdate = useDebounce((newVolume: number) => {
    ttsVolumeStorage.setVolume(newVolume);
  }, 300);
  const debouncedSpeechTemplateUpdate = useDebounce((newTemplate: string) => {
    // Set the template to `null` if the input is blank
    speechTemplateStorage.setTemplate(newTemplate?.trim() || null);
  }, 300);

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);

    currentVolumeRef.current = newVolume; // Update the ref to track current volume
    setLocalVolume(newVolume); // Update UI immediately
    debouncedVolumeUpdate(newVolume); // Debounce storage write
  };
  const handleSpeechTemplateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTemplate = event.target.value;
    setLocalSpeechTemplate(newTemplate); // Update UI immediately
    debouncedSpeechTemplateUpdate(newTemplate); // Debounce storage write
  };

  const handleVoiceEngineChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    ttsVoiceEngineStorage.setUri(value === '' ? null : value);
  };

  const testVoice = () => {
    setIsTestingVoice(true);
    const speech = speakText(t('voiceTestMessage'), voiceURI);
    cancelTestSpeechRef.current = speech.cancel;

    speech.promise.finally(() => {
      setIsTestingVoice(false);
      cancelTestSpeechRef.current = null;
    });
  };

  useEffect(() => {
    // Make sure to save the volume when the user closes the page
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      if (currentVolumeRef.current === storedVolume) {
        return;
      }

      ttsVolumeStorage.setVolume(currentVolumeRef.current);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [storedVolume]);

  useEffect(() => {
    // Load available voices
    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  // Sync local value with storage changes
  useEffect(() => {
    setLocalVolume(storedVolume);
  }, [storedVolume]);
  useEffect(() => {
    setLocalSpeechTemplate(speechTemplate ?? '');
  }, [speechTemplate]);

  // Cancel test voice when extension is disabled
  useEffect(() => {
    if (!enabled && isTestingVoice) {
      cancelTestSpeechRef.current?.();
    }
  }, [enabled, isTestingVoice]);

  return (
    <div className={cn('App', isLight ? 'light' : 'dark')}>
      <h1 className="mb-6 text-2xl font-bold">{t('settingsTitle')}</h1>

      <div className="space-y-6">
        <div>
          <h2>{t('extensionState')}</h2>
          <ToggleButton
            checked={enabled}
            onChange={extensionEnabledStorage.toggle}
            label={enabled ? t('enabled') : t('disabled')}
          />
        </div>
        <div>
          <h2>{t('theme')}</h2>
          <ToggleButton
            checked={isLight}
            onChange={exampleThemeStorage.toggle}
            label={isLight ? t('lightMode') : t('darkMode')}
          />
        </div>
        <div className="hidden">
          <h2 className="mb-2 font-semibold">{t('language')}</h2>
          <select
            value={language}
            onChange={handleLanguageChange}
            className="text-secondary bg-secondary border-primary rounded border px-3 py-2">
            {Object.entries(supportedLanguages).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <h2>{t('voiceEngine')}</h2>
          <div className="flex items-center space-x-2">
            <select value={voiceURI ?? ''} onChange={handleVoiceEngineChange} disabled={isTestingVoice}>
              {voices.length > 0 ? (
                <>
                  <option value="" selected={voiceURI === null}>
                    {t('noVoiceSelected')}
                  </option>
                  {voices.map(voice => (
                    <option key={voice.voiceURI} value={voice.voiceURI}>
                      [{voice.lang}] {voice.name}
                    </option>
                  ))}
                </>
              ) : (
                <option value="" disabled>
                  {t('loadingVoices')}
                </option>
              )}
            </select>
            <button onClick={testVoice} disabled={!enabled || isTestingVoice}>
              {t('testVoice')}
            </button>
          </div>
        </div>
        <div>
          <h2>{t('voiceVolume')}</h2>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={localVolume}
              onChange={handleVolumeChange}
              disabled={isTestingVoice}
              className="w-72"
            />
            <span className="w-12 text-sm font-medium">{Math.round(localVolume * 100)}%</span>
          </div>
        </div>
        <div>
          <h2>{t('speechTemplate')}</h2>
          <div className="space-y-2">
            <input
              type="text"
              value={localSpeechTemplate}
              onChange={handleSpeechTemplateChange}
              placeholder={DEFAULT_SPEECH_TEMPLATE}
              className={cn(
                'text-secondary bg-secondary border-primary w-full rounded border px-3 py-2',
                invalidFieldNames && 'border-red-500 focus:border-red-500 focus:ring-red-500',
              )}
            />
            <div>
              <p className="text-secondary text-sm">{t('speechTemplateDescription')}</p>
              <p className={cn('text-xs', !invalidFieldNames ? 'invisible' : 'text-red-500')}>
                {invalidFieldNames && t('invalidFieldNames', invalidFieldNames.map(name => `%(${name})`).join(', '))}
              </p>
            </div>
          </div>
        </div>

        {!isInline && (
          <>
            <hr />

            <div>
              <h1>{t('contacts')}</h1>
              <div className="space-x-2">
                <a
                  href={PROJECT_URL_OBJECT.url}
                  target="_blank"
                  title={t('openPage', t('githubRepository'))}
                  aria-label={t('githubRepository')}>
                  <icons.Github color={iconColor} size="32" />
                </a>
                <a
                  href={PROJECT_URL_OBJECT.x}
                  target="_blank"
                  title={t('openPage', t('xProfile'))}
                  aria-label={t('xProfile')}>
                  <icons.X color={iconColor} size="32" />
                </a>
              </div>
            </div>

            <hr />

            <div>
              <a href="chat-test.html">{t('openPage', t('testPage'))}</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Options, <LoadingSpinner />), ErrorDisplay);
