import { Log } from 'sarif';
import { AStepper, IHasOptions, OK, TNamed, TWorld } from '@haibun/core/build/lib/defs';
import { findStepperFromOption, stringOrError } from '@haibun/core/build/lib/util';

import { TINDEX_SUMMARY } from "@haibun/out-review/build/generate-html";
import { AStorage } from "@haibun/domain-storage/build/AStorage";
import { EMediaTypes } from '@haibun/domain-storage';

const TRACE_STORAGE = 'TRACE_STORAGE';
const INDEX_STORAGE = 'INDEX_STORAGE';

class sarif extends AStepper implements IHasOptions {
  sarifSource?: AStorage;
  indexDest?: AStorage;

  options = {
    [TRACE_STORAGE]: {
      desc: 'location of SARIF file',
      parse: (input: string) => stringOrError(input)
    },
    [INDEX_STORAGE]: {
      desc: 'location for index file',
      parse: (input: string) => stringOrError(input)
    }
  }

  setWorld(world: TWorld, steppers: AStepper[]) {
    super.setWorld(world, steppers);
    this.sarifSource = findStepperFromOption<AStorage>(steppers, this, this.getWorld().extraOptions, TRACE_STORAGE);
    this.indexDest = findStepperFromOption<AStorage>(steppers, this, this.getWorld().extraOptions, INDEX_STORAGE);
  }

  steps = {
    indexSarif: {
      gwta: `index the sarif file at {where}`,
      action: async ({ where }: TNamed) => {
        await this.indexSarif(where);
        return OK;
      }
    },
  }
  async indexSarif(loc: string) {
    const contents = await this.sarifSource!.readFile(loc, 'utf-8');
    const sarif: Log = JSON.parse(contents);

    let results = [];
    const dir = this.indexDest!.fromCaptureLocation(EMediaTypes.json, 'sarif');
    const dest = this.indexDest!.fromCaptureLocation(EMediaTypes.json, 'sarif', 'indexed.json');
    for (const result of sarif.runs[0].results!) {
      const res: TINDEX_SUMMARY = {
        ok: result.level !== 'error',
        title: result.message.text || 'no message',
        path: dest
      }
      results.push(res);
    }
    await this.indexDest!.ensureDirExists(dir);
    await this.indexDest!.writeFile(dest, JSON.stringify(results), EMediaTypes.json);
  }
}

export default sarif;
