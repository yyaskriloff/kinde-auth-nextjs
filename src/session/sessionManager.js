import {cookies} from 'next/headers';
import {isAppRouter} from '../utils/isAppRouter';
import {config} from '../config/index';

var cookie = require('cookie');

const TWENTY_NINE_DAYS = 2505600;

export const GLOBAL_COOKIE_OPTIONS = {
  sameSite: 'lax',
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  path: '/'
};

const COOKIE_LIST = [
  'id_token_payload',
  'id_token',
  'access_token_payload',
  'access_token',
  'user',
  'refresh_token',
  'post_login_redirect_url'
];

const MAX_LENGTH = 2000;

const splitString = (str, length) => {
  if (length <= 0) {
    return [];
  }
  const result = [];
  for (let i = 0; i < str.length; i += length) {
    result.push(str.slice(i, i + length));
  }
  return result;
};

/**
 *
 * @param {import('next').NextApiRequest} [req]
 * @param {import('next').NextApiResponse} [res]
 * @returns {import('@kinde-oss/kinde-typescript-sdk').SessionManager}
 */
export const sessionManager = (req, res) => {
  if (!req) return appRouterSessionManager(cookies());
  return isAppRouter(req)
    ? appRouterSessionManager(cookies())
    : pageRouterSessionManager(req, res);
};

/**
 *
 * @param {import("next/dist/server/web/spec-extension/adapters/request-cookies").ReadonlyRequestCookies} cookieStore
 * @returns {import('@kinde-oss/kinde-typescript-sdk').SessionManager}
 */
export const appRouterSessionManager = (cookieStore) => ({
  /**
   *
   * @param {string} itemKey
   * @returns {Promise<string | object | null>}
   */
  getSessionItem: (itemKey) => {
    const item = cookieStore.get(itemKey + '0');
    if (!item) return null;
    try {
      let itemValue = '';
      let index = 0;
      let key = `${String(itemKey)}${index}`;
      while (cookieStore.get(key)) {
        itemValue += cookieStore.get(key).value;
        index++;
        key = `${String(itemKey)}${index}`;
      }
      const jsonValue = JSON.parse(itemValue);
      if (typeof jsonValue === 'object') {
        return jsonValue;
      }
      return itemValue;
    } catch (error) {
      return item.value;
    }
  },
  /**
   *
   * @param {string} itemKey
   * @param {any} itemValue
   * @returns {Promise<void>}
   */
  setSessionItem: (itemKey, itemValue) => {
    if (itemValue !== undefined) {
      const itemValueString =
        typeof itemValue === 'object' ? JSON.stringify(itemValue) : itemValue;
      splitString(itemValueString, MAX_LENGTH).forEach((value, index) => {
        cookieStore.set(itemKey + index, value, {
          maxAge: TWENTY_NINE_DAYS,
          domain: config.cookieDomain ? config.cookieDomain : undefined,
          ...GLOBAL_COOKIE_OPTIONS
        });
      });
    }
  },
  /**
   *
   * @param {string} itemKey
   * @returns {Promise<void>}
   */
  removeSessionItem: (itemKey) => {
    cookieStore
      .getAll()
      .map((c) => c.name)
      .forEach((key) => {
        if (key.startsWith(`${String(itemKey)}`)) {
          cookieStore.set(itemKey, '', {
            domain: config.cookieDomain ? config.cookieDomain : undefined,
            maxAge: 0,
            ...GLOBAL_COOKIE_OPTIONS
          });
        }
      });
  },
  /**
   * @returns {Promise<void>}
   */
  destroySession: () => {
    cookieStore
      .getAll()
      .map((c) => c.name)
      .forEach((key) => {
        if (COOKIE_LIST.some((substr) => key.startsWith(substr))) {
          cookieStore.set(key, '', {
            domain: config.cookieDomain ? config.cookieDomain : undefined,
            maxAge: 0,
            ...GLOBAL_COOKIE_OPTIONS
          });
        }
      });
  }
});

/**
 *
 * @param {import('next/types').NextApiRequest} req
 * @param {import('next').NextApiResponse} [res]
 * @returns {import('@kinde-oss/kinde-typescript-sdk').SessionManager}
 */
export const pageRouterSessionManager = (req, res) => {
  return {
    /**
     *
     * @param {string} itemKey
     * @returns {Promise<string | undefined>}
     */
    getSessionItem: (itemKey) => {
      const itemValue = req.cookies[itemKey];
      if (itemValue) {
        try {
          const jsonValue = JSON.parse(itemValue);
          if (typeof jsonValue === 'object') {
            return jsonValue;
          }
          return itemValue;
        } catch (error) {
          return itemValue;
        }
      }
    },
    /**
     *
     * @param {string} itemKey
     * @param {any} itemValue
     * @returns {Promise<void>}
     */
    setSessionItem: (itemKey, itemValue) => {
      let cookies = res?.getHeader('Set-Cookie') || [];

      if (!Array.isArray(cookies)) {
        cookies = [cookies.toString()];
      }

      res?.setHeader('Set-Cookie', [
        ...cookies.filter((cookie) => !cookie.startsWith(`${itemKey}=`)),
        cookie.serialize(
          itemKey,
          typeof itemValue === 'object' ? JSON.stringify(itemValue) : itemValue,
          {
            domain: config.cookieDomain ? config.cookieDomain : undefined,
            ...GLOBAL_COOKIE_OPTIONS,
            maxAge: TWENTY_NINE_DAYS
          }
        )
      ]);
    },
    /**
     *
     * @param {string} itemKey
     * @returns {Promise<void>}
     */
    removeSessionItem: (itemKey) => {
      res?.setHeader('Set-Cookie', [
        cookie.serialize(itemKey, '', {
          domain: config.cookieDomain ? config.cookieDomain : undefined,
          maxAge: -1,
          ...GLOBAL_COOKIE_OPTIONS
        })
      ]);
    },
    destroySession: () => {
      res?.setHeader('Set-Cookie', [
        ...COOKIE_LIST.map((name) =>
          cookie.serialize(name, '', {
            domain: config.cookieDomain ? config.cookieDomain : undefined,
            maxAge: -1,
            ...GLOBAL_COOKIE_OPTIONS
          })
        )
      ]);
    }
  };
};
