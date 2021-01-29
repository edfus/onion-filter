import { createReadStream, existsSync, readdir, writeFile } from "fs";
import { Writable } from "stream";

const promiseMap = new WeakMap();

const wordTree = {
  _$: {},
  _getPromiseObj() {
    let promise = promiseMap.get(this);

    if(!promise) {
      let res, rej;
      const tmpPromise = new Promise((resolve, reject) => {
        res = resolve; rej = reject;
      })
      promiseMap.set(this, {
        resolve: res,
        reject: rej,
        promise: tmpPromise
      });

      promise = promiseMap.get(this);
    }

    return promise;
  },
  add (wordArr) {
    wordArr.forEach(word => this.addWord(word));
  },
  addWord (word) {
    if(!word?.length)
      return ;
    word = word.trim();
    if(word.length < 2)
      return ;

    const prefix = word[0];
    if(Array.isArray(this._$[prefix]))
      this._$[prefix].push(word);
    else this._$[prefix] = [word];
  },
  getPrefix (char) {
    return this._$[char] || [];
  },
  isWordPrefixed (str, positions = 0) {
    if(!str?.length)
      return false;

    return (
      new Array(positions + 1).fill(undefined)
        .map((empty, index) => str[index])
        .some(prefix => {
          if(Array.isArray(this._$[prefix]))
            return this._$[prefix].some(word => str.startsWith(word));
          else return false;
        })
    );
  },
  get construction () {
    return this._getPromiseObj().promise;
  },
  set constructed (value) {
    return value
      ? this._getPromiseObj().resolve()
      : this._getPromiseObj().reject()
      ;
  }
}

let reusageCounter = 0;

process.on("beforeExit", () => console.info("reusageCount: " + reusageCounter));

const regex = (function (pattern, flags) {
  if(this.cache instanceof Map) {
    if(this.cache.has(pattern)) {
      reusageCounter ++;
      return this.cache.get(pattern);
    }
  } else {
    this.cache = new Map();
  }

  const regularExpression = new RegExp(pattern);

  this.cache.set(pattern, regularExpression);

  return regularExpression;
}).bind({});

/**
 * 
 * *****************
 * 
 * 
 */

import { toSearch as _toSearch, keysFolder as _keysFolder} from "./config.mjs";

const toSearch = _toSearch || "abcd";
const keysFolder = _keysFolder || "./keys";
const wordsFilePath = "./WORDS.txt";
const resultFolder = "./result";

if(!existsSync(resultFolder))
  throw new Error(`resultFolder: ${resultFolder} not found`);

readdir(keysFolder, async (err, domains) => {
  if(err) throw err;
  write("fol-by-last-char3+", domains.filter(domain => regex(`${toSearch}{4,}`).test(domain)));
  write("fol-by-num4+", domains.filter(domain => regex(`${toSearch}[0-9]{4,}`).test(domain)));
  await wordTree.construction;
  write("ends-with-word", domains.filter(domain => 
    wordTree.isWordPrefixed(cutLeft(domain, toSearch.slice(0, toSearch.length - 2)), 2)
  ));
  write("fol-by-num+word", domains.filter(domain => 
    wordTree.isWordPrefixed(cutLeft(domain, regex(`${toSearch}[0-9]+`)))
  ));
});

const decoder = new TextDecoder("utf8");

createReadStream(wordsFilePath, "utf8")
  .pipe(
    new Writable({
      write (chunk, encoding, cb) {
        const str = decoder.decode(chunk, { stream: true });
        wordTree.add(str.split(/\r?\n/));
        return cb();
      },
      final (cb) {
        wordTree.add(decoder.decode().split(/\r?\n/));
        wordTree.constructed = true;
        return cb();
      }
    })
  );

function cutLeft (str, regex) {
  let matched;
  const result = str.replace(
    regex,
    () => {
      matched = true;
      return "";
    }
  );
  if(matched) return result;
  else return false;
}

function write (name, arr) {
  writeFile(`${resultFolder}/${name}.json`, JSON.stringify(arr, null, 4), () => console.info(`${name}.json done`));
}