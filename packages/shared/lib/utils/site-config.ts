import type { FieldExtractor } from './text-to-speech';

export type SiteConfig = {
  id: string;
  name: string;
  urlPatterns: string[];
  containerSelector?: string;
  loadDetectionSelector?: string;
  messageSelector: string;
  fields: FieldExtractor[];
  pollingInterval?: number;
};
export type SiteId = (typeof siteConfigs)[number]['id'];

export const siteConfigs = [
  {
    id: 'youtube',
    name: 'YouTube Live Chat',
    urlPatterns: ['https://www.youtube.com/live_chat', 'https://studio.youtube.com/live_chat'],
    containerSelector: '#items',
    messageSelector: 'yt-live-chat-text-message-renderer',
    fields: [
      { name: 'name', selector: '#author-name' },
      { name: 'body', selector: '#message' },
    ],
  },
  {
    id: 'twitch',
    name: 'Twitch Chat',
    urlPatterns: ['https://www.twitch.tv/', 'https://dashboard.twitch.tv/'],
    containerSelector: '.chat-scrollable-area__message-container',
    loadDetectionSelector: '[data-a-target="chat-welcome-message"]',
    messageSelector: '.chat-line__message-container',
    fields: [
      { name: 'name', selector: '.chat-author__display-name' },
      { name: 'body', selector: '[data-a-target="chat-line-message-body"]' },
    ],
  },
] as const satisfies SiteConfig[];

export const findSiteConfigByUrl = (url: string): SiteConfig | null => {
  // Use YouTube config for test screen
  if (url.startsWith('chrome-extension:') && url.includes('/chat-test.html')) {
    return siteConfigs[0];
  }

  return siteConfigs.find(config => config.urlPatterns.some(pattern => url.startsWith(pattern))) ?? null;
};
