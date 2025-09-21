import { validateSpeechTemplate } from './util';
import rawChangelog from '../../CHANGELOG.md?raw';
import {
  PROJECT_URL_OBJECT,
  supportedLanguages,
  t,
  useDebounce,
  useStorage,
  useSubscribeIcon,
  DEFAULT_SPEECH_TEMPLATE,
  speakText,
} from '@extension/shared';
import {
  extensionEnabledStorage,
  languageStorage,
  speechTemplateStorage,
  textFilterStorage,
  themeStorage,
  ttsRateStorage,
  ttsVoiceEngineStorage,
  ttsVolumeStorage,
} from '@extension/storage';
import { cn, IconButton, LabeledToggleButton, icons } from '@extension/ui';
import { useEffect, useMemo, useRef, useState } from 'react';

const Settings = () => {
  const { enabled } = useStorage(extensionEnabledStorage);
  const { language } = useStorage(languageStorage);
  const { isLight } = useStorage(themeStorage);
  const { rate: storedRate } = useStorage(ttsRateStorage);
  const { template: speechTemplate } = useStorage(speechTemplateStorage);
  const { volume: storedVolume } = useStorage(ttsVolumeStorage);
  const { uri: voiceURI } = useStorage(ttsVoiceEngineStorage);
  const { filters } = useStorage(textFilterStorage);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [localRate, setLocalRate] = useState(storedRate);
  const [localSpeechTemplate, setLocalSpeechTemplate] = useState(speechTemplate ?? '');
  const [localVolume, setLocalVolume] = useState(storedVolume);
  const [isTestingVoice, setIsTestingVoice] = useState(false);

  const currentVolumeRef = useRef(storedVolume);
  const cancelTestSpeechRef = useRef<(() => void) | null>(null);

  const changelog = rawChangelog.replace(/^# Changelog/, '').trim();

  const invalidFieldNames = useMemo(() => validateSpeechTemplate(localSpeechTemplate), [localSpeechTemplate]);
  const enabledFilterCount = useMemo(() => filters.filter(filter => filter.enabled).length, [filters]);

  // Check if we're in inline mode (embedded in iframe)
  const isInline = new URLSearchParams(window.location.search).has('inline');

  useSubscribeIcon();

  const handleLanguageChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    languageStorage.setLanguage(event.target.value);
  };

  const debouncedVolumeUpdate = useDebounce(ttsVolumeStorage.setVolume, 300);
  const debouncedRateUpdate = useDebounce(ttsRateStorage.setRate, 300);
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
  const handleRateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = parseFloat(event.target.value);
    setLocalRate(newRate); // Update UI immediately
    debouncedRateUpdate(newRate); // Debounce storage write
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

  const startVoiceTest = () => {
    setIsTestingVoice(true);
    const speech = speakText(t('voiceTestMessage'));
    cancelTestSpeechRef.current = speech.cancel;

    speech.promise.finally(() => {
      setIsTestingVoice(false);
      cancelTestSpeechRef.current = null;
    });
  };

  const cancelVoiceTest = () => {
    cancelTestSpeechRef.current?.();
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
    setLocalRate(storedRate);
  }, [storedRate]);
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
    <>
      <h1 className="mb-6 text-2xl font-bold">{t('settingsTitle')}</h1>

      <div className="space-y-6">
        <div>
          <h2>{t('extensionState')}</h2>
          <LabeledToggleButton
            checked={enabled}
            onChange={extensionEnabledStorage.toggle}
            currentState={enabled ? t('enabled') : t('disabled')}
            description={t('extensionStateDescription')}
          />
        </div>
        <div>
          <h2>{t('theme')}</h2>
          <LabeledToggleButton
            checked={isLight}
            onChange={themeStorage.toggle}
            currentState={isLight ? t('lightMode') : t('darkMode')}
            description={t('themeDescription')}
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
            <button onClick={isTestingVoice ? cancelVoiceTest : startVoiceTest} disabled={!enabled}>
              {isTestingVoice ? t('cancel') : t('testVoice')}
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
          <h2>{t('speechRate')}</h2>
          <div className="flex items-center space-x-4">
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={localRate}
              onChange={handleRateChange}
              disabled={isTestingVoice}
              className="w-72"
            />
            <span className="w-12 text-sm font-medium">{localRate.toFixed(1)}x</span>
          </div>
          <p className={cn('mt-2 text-sm text-red-500', localRate <= 2.0 && 'invisible')}>{t('speechRateNote')}</p>
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

        <div>
          <div className="mb-2 flex items-center space-x-2">
            <h2 className="mb-0!">{t('filterSettings')}</h2>
            <span className="text-secondary text-sm">{t('filtersInUse', enabledFilterCount.toString())}</span>
          </div>
          <a href="#filter">{t('openPage', t('filterSettings'))}</a>
        </div>

        <div>
          <h2>{t('testPage')}</h2>
          <a href="chat-test.html">{t('openPage', t('testPage'))}</a>
        </div>

        {!isInline && (
          <div className="divide-y divide-gray-600 border-t border-gray-600 [&>*]:py-2">
            <div>
              <h1>{t('changelog')}</h1>
              <p className="mb-2">
                <a href={`${PROJECT_URL_OBJECT.url}/blob/main/CHANGELOG.md`} target="_blank" rel="noopener noreferrer">
                  {t('viewOnGitHub')}
                </a>
              </p>
              <div className="form-control max-h-60 w-full max-w-none! overflow-y-scroll font-mono text-sm whitespace-pre-wrap">
                {changelog}
              </div>
            </div>

            <div>
              <h1>{t('contacts')}</h1>
              <div className="space-x-2">
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
          </div>
        )}
      </div>
    </>
  );
};

export default Settings;
