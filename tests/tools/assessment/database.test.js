import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

function loadModule() {
  const source = fs.readFileSync(path.resolve('tools/assessment/utils/database.ts'), 'utf8');
  const transpiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } });

  const releaseMock = function () { releaseMock.calls++; };
  releaseMock.calls = 0;
  const endMock = async function () { endMock.calls++; };
  endMock.calls = 0;

 const sandbox = {
   require: (mod) => {
      if (mod === 'pg') {
        return {
          Pool: class {
            async connect() { return { release: releaseMock }; }
            async end() { await endMock(); }
          }
        };
      }
      throw new Error(`Unexpected module ${mod}`);
    },
  };
  sandbox.exports = {};
  sandbox.module = { exports: sandbox.exports };
  sandbox.process = { env: {} };

  vm.runInNewContext(transpiled.outputText, sandbox, { filename: 'database.js' });
  return { ...sandbox.module.exports, releaseMock, endMock };
}

const { withTestDatabaseClient, releaseMock, endMock } = loadModule();

test('releases connection after successful callback', async () => {
  await withTestDatabaseClient({}, async () => {});
  assert.equal(releaseMock.calls, 1);
  assert.equal(endMock.calls, 1);
});

test('releases connection even if callback throws', async () => {
  await assert.rejects(
    withTestDatabaseClient({}, async () => {
      throw new Error('failure');
    }),
    /failure/
  );
  assert.equal(releaseMock.calls, 2);
  assert.equal(endMock.calls, 2);
});
