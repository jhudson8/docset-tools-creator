import {
  CreatorFunctionOptions,
  SubSelector,
  DocsetEntries,
  BrowserData,
} from "./types";
import puppeteer, { WrapElementHandle, ElementHandle } from "puppeteer-core";

interface GetterFunction {
  (element: ElementHandle<HTMLElement>): Promise<ElementHandle<HTMLElement>>;
}

interface BrowserDataOptions {
  url: string;
  waitFor?: string;
  getters: GetterFunction[];
  initialValue: ElementHandle<HTMLElement>;
}

export default async function (
  inputEntries: DocsetEntries,
  options: CreatorFunctionOptions
): Promise<DocsetEntries> {
  if (!options.selectors || options.selectors.length === 0) {
    return inputEntries;
  }

  const browser = await puppeteer.launch({
    executablePath: options.chromeExePath,
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1800 });

    // create util functions with inner scope
    const formatUrl = (url: string): string => {
      return url;
    };

    const goTo = async (options: { url: string; waitFor?: string }) => {
      const url = formatUrl(options.url);
      console.log("navigating to " + url);
      page.goto(url);

      let response_event_occurred = false;
      const response_handler = function () {
        response_event_occurred = true;
      };
      const response_watcher = new Promise(function (resolve, reject) {
        setTimeout(function () {
          if (!response_event_occurred) {
            resolve(true);
          } else {
            setTimeout(function () {
              resolve(true);
            }, 30000);
          }
          page.removeListener("response", response_handler);
        }, 500);
      });
      page.on("response", response_handler);

      var navigation_watcher = page.waitForNavigation();
      await Promise.race([response_watcher, navigation_watcher]);
      await waitFor(options.waitFor || "body");
    };

    const createVerifyElementFunction = (options: BrowserDataOptions) => {
      const { url, getters, waitFor, initialValue } = options;
      return async (): Promise<ElementHandle<HTMLElement>> => {
        if (page.url() !== url) {
          await goTo({ url, waitFor });
        } else {
          return initialValue;
        }
        let _element: ElementHandle<HTMLElement>;
        for (let i = 0; i < getters.length; i++) {
          const getter = getters[i];
          _element = await getter(_element);
        }
        return _element;
      };
    };

    const getBody = async (): Promise<BrowserData> => {
      const body = await page.$("body");
      return createBrowserData({
        url: page.url(),
        getters: [() => page.$("body")],
        initialValue: body,
      });
    };

    const waitFor = async (selector: string): Promise<void> => {
      await page.waitForSelector(selector, { timeout: 5000 });
    };

    const processSelector = async (
      selector: SubSelector,
      _options: BrowserDataOptions
    ) => {
      if (!selector.value) {
        throw new Error('selector "' + selector.selector + '" has no value');
      }
      const { url, getters, waitFor } = _options;
      const element = await createVerifyElementFunction(_options)();
      const entries = await element.$$(selector.selector);
      if (entries.length === 0) {
        console.error(
          'No entries found for "' + selector.selector + '" on ' + page.url()
        );
      }

      let rtn = {};
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const browserData = createBrowserData({
          url,
          getters: [
            ...getters,
            scoped<GetterFunction>(
              (i) => async (element) => {
                const entries = await element.$$(selector.selector);
                return entries[i];
              },
              [i]
            ),
          ],
          initialValue: entry,
          waitFor,
        });
        const value = await selector.value(browserData);
        // normalize the entries
        for (let type in value) {
          const typeEntries = (value as any)[type];
          for (let name in typeEntries) {
            let value = typeEntries[name];
            if (!value.match(/^[a-z]*:\/\//)) {
              // it's a local reference
              if (value.startsWith("#")) {
                const fileName = _options.url.match(/([^/]*)$/)[1];
                value = fileName + value;
              }
              value = value.replace(/^\.?\//, "");
              const base = _options.url.replace(/[^\/]*^/, "");
              value = base + value;
              typeEntries[name] = value;
            }
          }
        }
        rtn = union(rtn, value);
      }
      return rtn;
    };

    const union = (a: DocsetEntries, b: DocsetEntries): DocsetEntries => {
      a = a || {};
      b = b || {};
      const anyA = a as any;
      Object.entries(b).forEach(([key, bEntries]) => {
        if (!anyA[key]) {
          anyA[key] = {};
        }
        const aEntries = anyA[key];
        anyA[key] = { ...aEntries, ...bEntries };
      });
      return anyA;
    };

    const createBrowserData = (options: BrowserDataOptions): BrowserData => {
      const { url, getters, initialValue, waitFor } = options;
      let element = initialValue;
      const verifyElement = createVerifyElementFunction(options);

      return {
        outerHTML: async (): Promise<string> => {
          if (!element) {
            return null;
          }
          element = await verifyElement();
          const rtn = await (
            await element.getProperty("outerHTML")
          ).jsonValue();
          return rtn as string;
        },
        innerText: async (): Promise<string> => {
          if (!element) {
            return null;
          }
          element = await verifyElement();
          const rtn = await (
            await element.getProperty("innerText")
          ).jsonValue();
          return rtn as string;
        },
        attr: async (key: string): Promise<string> => {
          if (!element) {
            return null;
          }
          element = await verifyElement();
          const rtn = await (await element.getProperty(key)).jsonValue();
          return rtn as string;
        },
        single: async (selector: string) => {
          element = await verifyElement();
          const value = await element.$(selector);
          if (value) {
            return createBrowserData({
              url,
              getters: [...getters, (element) => element.$(selector)],
              initialValue: value,
            });
          } else {
            throw new Error(
              '"single" selector did not match results: ' +
                selector +
                " on " +
                page.url()
            );
          }
        },
        all: async (selector: string) => {
          const values = await element.$$(selector);
          const rtn = [];
          for (let i = 0; i < values.length; i++) {
            const browserData = createBrowserData({
              url,
              getters: [
                ...getters,
                scoped<GetterFunction>(
                  (i) => async (element) => {
                    const values = await element.$$(selector);
                    return values[i];
                  },
                  [i]
                ),
              ],
              initialValue: values[i],
            });
            rtn.push(browserData);
          }
          return rtn;
        },
        addTo: async (
          selector: SubSelector,
          value?: DocsetEntries
        ): Promise<DocsetEntries> => {
          value = value || {};
          const rtn = await processSelector(selector, options);
          return union(value, rtn);
        },
        goTo: async (url: string, waitFor?: string): Promise<BrowserData> => {
          if (typeof url !== "string") {
            throw new Error("Invalud url: " + url);
          }
          await goTo({ url, waitFor });
          const rtn = await getBody();
          return rtn;
        },
      };
    };

    const entries = union({}, inputEntries);
    for (let i = 0; i < options.selectors.length; i++) {
      const selector = options.selectors[i];
      await goTo({ url: selector.url, waitFor: selector.waitFor });
      const initialValue = await page.$("body");
      const value = await processSelector(options.selectors[i], {
        url: selector.url,
        initialValue,
        getters: [() => page.$("body")],
        waitFor: selector.waitFor,
      });
      union(entries, value);
    }

    options.entries = union(options.entries, entries);

    await browser.close();
    return entries;
  } catch (e) {
    console.error(e);
    await browser.close();
    throw e;
  }
}

function scoped<T>(func: (...args: any[]) => T, args: any[]) {
  return func(...args);
}
