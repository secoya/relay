/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayFileIRParser
 * @flow
 * @format
 */

'use strict';

const FileParser = require('FileParser');
const FindGraphQLTags = require('FindGraphQLTags');
const GraphQL = require('graphql');

const fs = require('fs');
const invariant = require('invariant');
const path = require('path');

import type {FileFilter} from 'RelayCodegenWatcher';
import type {DocumentNode} from 'graphql';

// Throws an error if parsing the file fails
function parseFile(file: string, text: string): ?DocumentNode {
  const moduleName = path.basename(file, path.extname(file));

  invariant(
    text.indexOf('graphql') >= 0,
    'RelayFileIRParser: Files should be filtered before passed to the ' +
      'parser, got unfiltered file `%s`.',
    file,
  );

  const astDefinitions = [];
  FindGraphQLTags.memoizedFind(text, file).forEach(({tag, template}) => {
    if (!(tag === 'graphql' || tag === 'graphql.experimental')) {
      throw new Error(
        `Invalid tag ${tag} in ${file}. ` +
          'Expected graphql`` (common case) or ' +
          'graphql.experimental`` (if using experimental directives).',
      );
    }
    if (
      tag !== 'graphql.experimental' &&
      /@argument(Definition)?s\b/.test(template)
    ) {
      throw new Error(
        'Unexpected use of fragment variables: @arguments and ' +
          '@argumentDefinitions are only supported in ' +
          'graphql.experimental literals. Source: ' +
          template,
      );
    }
    const ast = GraphQL.parse(new GraphQL.Source(template, file));
    invariant(
      ast.definitions.length,
      'RelayFileIRParser: Expected GraphQL text to contain at least one ' +
        'definition (fragment, mutation, query, subscription), got `%s`.',
      template,
    );

    astDefinitions.push(...ast.definitions);
  });

  return {
    kind: 'Document',
    definitions: astDefinitions,
  };
}

type TransformFactory = (baseDir: string) => (filename: string, text: string) => string
type TransformModule = { default: TransformFactory }

function getParser(transformModules: Array<string> = []) {
  return (baseDir: string): FileParser => {
    const transformer = getTransformer(baseDir, transformModules);
    return new FileParser({
      baseDir,
      parse: (filename: string) => {
        const text = fs.readFileSync(filename, 'utf8');
        return parseFile(filename, transformer(filename, text));
      },
    });
  };
}

function getTransformer(baseDir: string, transformModules: Array<string> = []) {
  let transformer = (filename: string, text: string) => text;
  if (transformModules.length) {
    transformModules.forEach(moduleName => {
      let moduleImpl: TransformFactory;
      try {
        /* eslint-disable */
        // $FlowFixMe flow doesn't know about __non_webpack_require__
        moduleImpl = (__non_webpack_require__(moduleName): TransformFactory);
        invariant(
          moduleImpl.default,
          'Transformer module "' + moduleName + '" should have a default export'
        );
        /* eslint-enable */
      } catch (e) {
        throw new Error(
          'Can not resolve transformer module "' + moduleName + '"'
        );
      }
      const transformerImpl = moduleImpl.default(baseDir);
      const prevTransformer = transformer;
      transformer = (filename: string, text: string) => transformerImpl(filename, prevTransformer(filename, text));
    });
  }

  return transformer;
}

function getFileFilter(baseDir: string): FileFilter {
  return (filename: string) => {
    const text = fs.readFileSync(path.join(baseDir, filename), 'utf8');
    return text.indexOf('graphql') >= 0;
  };
}

module.exports = {
  getParser,
  getFileFilter,
};
