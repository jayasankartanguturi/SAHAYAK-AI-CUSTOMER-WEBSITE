import en from './en.json';
import te from './te.json';
import hi from './hi.json';

const DICTIONARIES = {
  English: en,
  Telugu: te,
  Hindi: hi,
};

function getNestedValue(obj, key) {
  return key.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : undefined), obj);
}

export function createTranslator(language) {
  const dict = DICTIONARIES[language] || en;

  return function t(key, vars = {}) {
    let val = getNestedValue(dict, key);
    if (val === undefined) {
      val = getNestedValue(en, key);
    }
    if (val === undefined) {
      return key;
    }
    if (typeof val === 'string') {
      return val.replace(/\{\{(\w+)\}\}/g, (_, k) =>
        vars[k] !== undefined ? String(vars[k]) : `{{${k}}}`
      );
    }
    return val;
  };
}

