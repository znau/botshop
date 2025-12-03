import i18next, { type InitOptions } from 'i18next';
import zh, { type ZhTranslation } from './zh';
import en, { type EnTranslation } from './en';

export type SupportedLanguage = 'zh' | 'en';

const resources = {
	en: {
		translation: en,
	},
	zh: {
		translation: zh,
	},
} satisfies Record<SupportedLanguage, { translation: ZhTranslation | EnTranslation }>;

const initOptions: InitOptions = {
	fallbackLng: 'en',
	resources,
	interpolation: { escapeValue: false },
};

void i18next.init(initOptions);

export const t = (
	key: string,
	lang: SupportedLanguage = 'en',
	values?: Record<string, unknown>,
) => i18next.t(key, { lng: lang, ...(values ?? {}) });

export default i18next;
