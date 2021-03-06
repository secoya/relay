/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule commitLocalUpdate
 * @flow
 * @format
 */

'use strict';

import type {StoreUpdater, Environment} from 'RelayStoreTypes';

function commitLocalUpdate(
  environment: Environment,
  updater: StoreUpdater,
): void {
  environment.commitUpdate(updater);
}

module.exports = commitLocalUpdate;
