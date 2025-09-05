import nock from 'nock';

nock.disableNetConnect();

afterEach(() => {
  nock.cleanAll();
});
