import disable from './core/disable/index.js';
import enable from './core/enable/index.js';
import setwelcome from './core/setwelcome/index.js';

import mpreg from './fun/mpreg/index.js';

import addrole from './moderation/addrole/index.js';
import ban from './moderation/ban/index.js';
import kick from './moderation/kick/index.js';
import nuke from './moderation/nuke/index.js';
import purge from './moderation/purge/index.js';
import removerole from './moderation/removerole/index.js';
import timeout from './moderation/timeout/index.js';

import google from './search/google/index.js';
import plugin from './search/plugin/index.js';

import help from './utility/help/index.js';
import note from './utility/note/index.js';
import stats from './utility/stats/index.js';

const commands = [
  disable,
  enable,
  setwelcome,
  mpreg,
  addrole,
  ban,
  kick,
  nuke,
  purge,
  removerole,
  timeout,
  google,
  plugin,
  help,
  note,
  stats,
];

export default commands;
