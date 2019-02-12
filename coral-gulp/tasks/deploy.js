/*
 * ADOBE CONFIDENTIAL
 *
 * Copyright 2018 Adobe
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe and its
 * suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe.
 */
module.exports = function(gulp) {
  
  const path = require('path');
  const ghPages = require('gulp-gh-pages');
  const util = require('../helpers/util');
  
  gulp.task('deploy', () => {
    if (!util.isTLB()) {
      console.error('Deploy aborted: not in root folder.');
      
      return;
    }
    
    return gulp
      .src('./dist/**/*', {base: '.'})
      .pipe(ghPages({
        message: `CORAL-0: deploy ${util.getPackageJSON().version}`
      }));
  });
};