import ready from './ready/index.js';
import messageCreate from './messageCreate/index.js';
import guildMemberAdd from './guildMemberAdd/index.js';
import interactionCreate from './interactionCreate/index.js';

const events = [ready, messageCreate, guildMemberAdd, interactionCreate];

export default events;
