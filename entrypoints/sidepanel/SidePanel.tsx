import './SidePanel.css';
import { t, logger, useStorage, useThemeStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { logConsoleStorage, logStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';
import { useEffect, useState } from 'react';
import type { LogEntry } from '@extension/storage/lib/base/types';

const manifestJson = browser.runtime.getManifest();

const SidePanel = () => {
  useThemeStorage(); // Ensure data-theme is set for <html>

  const { enabled: consoleLogging } = useStorage(logConsoleStorage);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [storageData, setStorageData] = useState<Record<string, unknown>>({});
  const [enabledLevels, setEnabledLevels] = useState<Record<LogEntry['level'], boolean>>({
    error: true,
    warn: true,
    info: true,
    debug: true,
  });

  useEffect(() => {
    const loadLogs = async () => {
      const recentLogs = await logStorage.getRecentLogs(50);
      setLogs(recentLogs);
    };

    loadLogs();

    // Subscribe to log changes
    const unsubscribe = logStorage.subscribe(() => {
      loadLogs();
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const getAllStorage = async () => {
      const data = await browser.storage.local.get();
      const processedData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => {
          if (key === 'log-storage-key' && value && typeof value === 'object' && 'entries' in value) {
            const logData = value as { entries: unknown[]; maxEntries: number };
            return [key, { entries: `[${logData.entries?.length || 0} items]`, maxEntries: logData.maxEntries }];
          }
          return [key, value];
        }),
      );
      setStorageData(processedData);
    };

    getAllStorage();

    // Listen for storage changes
    const handleStorageChange = (changes: { [key: string]: Browser.storage.StorageChange }) => {
      setStorageData(prev => {
        const updated = { ...prev };
        Object.entries(changes).forEach(([key, { newValue }]) => {
          if (newValue !== undefined) {
            if (key === 'log-storage-key' && newValue && typeof newValue === 'object' && 'entries' in newValue) {
              const logData = newValue as { entries: unknown[]; maxEntries: number };
              updated[key] = { entries: `[${logData.entries?.length || 0} items]`, maxEntries: logData.maxEntries };
            } else {
              updated[key] = newValue;
            }
          } else {
            delete updated[key];
          }
        });
        return updated;
      });
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const [hours, minutes, seconds] = [date.getHours(), date.getMinutes(), date.getSeconds()].map(n =>
      n.toString().padStart(2, '0'),
    );
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return [hours, minutes, seconds].join(':') + '.' + ms;
  };

  const levelColors: Record<LogEntry['level'], string> = {
    error: 'text-red-500',
    warn: 'text-yellow-500',
    info: 'text-blue-500',
    debug: 'text-gray-500',
  };

  const filteredLogs = logs.filter(log => enabledLevels[log.level]);

  const toggleLevel = (level: LogEntry['level']) => {
    setEnabledLevels(prev => ({ ...prev, [level]: !prev[level] }));
  };

  const clearLogs = async () => {
    await logStorage.clearLogs();
  };

  const copyToClipboard = async (data: unknown, description: string) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    } catch (error) {
      logger.error(`Failed to copy ${description}:`, error);
    }
  };

  const copyLogs = () => copyToClipboard(filteredLogs, 'logs');
  const copyStorage = () => copyToClipboard(storageData, 'storage');

  return (
    <div className="App">
      <div className="px-6 pt-6">
        <div className="warning">
          <div className="flex items-center">
            <div className="ml-3">
              <h3>{t('debugPanel')}</h3>
              <div className="text">
                <p>{t('debugPanelDescription')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Technical Information */}
        <div className="mt-4 space-y-2">
          <h3 className="text-sm font-semibold">
            <a href="/manifest.json">Extension Information (manifest.json)</a>
          </h3>
          <div className="bg-secondary space-y-1 rounded p-3 font-mono text-xs">
            <div>
              <span className="text-secondary">Name:</span> <span className="text-primary">{manifestJson.name}</span>
            </div>
            <div>
              <span className="text-secondary">Version:</span>{' '}
              <span className="text-primary">{manifestJson.version}</span>
            </div>
            <div>
              <span className="text-secondary">Extension ID:</span>{' '}
              <span className="text-primary">{browser.runtime.id}</span>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <ToggleButton
            checked={consoleLogging}
            onChange={logConsoleStorage.toggle}
            label={consoleLogging ? 'Console Logging: On' : 'Console Logging: Off'}
          />
        </div>
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Logs:</h3>
            <div className="ml-4 flex gap-3 space-x-1 text-xs">
              {(Object.keys(levelColors) as LogEntry['level'][]).map(level => (
                <label key={level} className="flex cursor-pointer items-center gap-1">
                  <input
                    type="checkbox"
                    checked={enabledLevels[level]}
                    onChange={() => toggleLevel(level)}
                    className="rounded"
                  />
                  <span className={levelColors[level]}>{level}</span>
                </label>
              ))}
            </div>

            <div className="flex-1"></div>

            <div className="flex gap-2">
              <button
                onClick={copyLogs}
                className="bg-secondary border-primary rounded border px-2 py-1 text-xs hover:opacity-80">
                Copy
              </button>
              <button
                onClick={clearLogs}
                className="bg-secondary border-primary rounded border px-2 py-1 text-xs hover:opacity-80">
                Clear
              </button>
            </div>
          </div>

          <pre className="bg-secondary mt-2 h-64 space-y-1 overflow-auto rounded p-2 text-xs break-words whitespace-pre-wrap">
            {filteredLogs.length === 0 ? (
              <div className="text-secondary">No logs available</div>
            ) : (
              filteredLogs.map((log, index) => (
                <div key={index} className="font-mono">
                  <span className="text-secondary">{formatTimestamp(log.timestamp)}</span>{' '}
                  <span className={cn('inline-block w-12', levelColors[log.level])}>[{log.level.toUpperCase()}]</span>{' '}
                  <span className="text-primary">{log.message}</span>
                  {log.data && (
                    <div className="text-secondary ml-4 text-xs">
                      {String(typeof log.data === 'string' ? log.data : JSON.stringify(log.data))}
                    </div>
                  )}
                </div>
              ))
            )}
          </pre>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between space-y-2">
            <h3 className="text-sm font-semibold">App Storage:</h3>
            <button
              onClick={copyStorage}
              className="bg-secondary border-primary rounded border px-2 py-1 text-xs hover:opacity-80">
              Copy
            </button>
          </div>
          <pre className="bg-secondary h-64 overflow-auto rounded p-2 text-xs break-words whitespace-pre-wrap">
            {JSON.stringify(storageData, null, 2)}
          </pre>
        </div>
      </div>

      <iframe
        className="h-[30rem] w-full p-0 [&::-webkit-scrollbar]:hidden"
        src="/options.html?inline=1"
        title="Options"></iframe>
    </div>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
