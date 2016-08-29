import nconf from 'nconf';

nconf.file('./_config.json');

export default nconf.get();
