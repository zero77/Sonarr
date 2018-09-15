// will download and run sonarr (server) in a non-windows enviroment
// you can use this if you don't care about the server code and just want to work
// with the web code.

const http = require('http');
const gulp = require('gulp');
const fs = require('fs');
const targz = require('tar.gz');
const del = require('del');
const spawn = require('child_process').spawn;

function download(url, dest, cb) {
  console.log(`Downloading ${url} to ${dest}`);
  const file = fs.createWriteStream(dest);
  http.get(url, (response) => {
    response.pipe(file);
    file.on('finish', () => {
      console.log('Download completed');
      file.close(cb);
    });
  });
}

function getLatest(cb) {
  let branch = 'develop';
  process.argv.forEach((val) => {
    const branchMatch = (/branch=([\S]*)/).exec(val);
    if (branchMatch && branchMatch.length > 1) {
      branch = branchMatch[1];
    }
  });

  const url = `http://services.sonarr.tv/v1/update/${branch}?os=osx`;

  console.log('Checking for latest version:', url);

  http.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      const updatePackage = JSON.parse(data).updatePackage;
      console.log(`Latest version available: ${updatePackage.version} Release Date: ${updatePackage.releaseDate}`);
      cb(updatePackage);
    });
  }).on('error', (e) => {
    console.log(`problem with request: ${e.message}`);
  });
}

function extract(source, dest, cb) {
  console.log(`extracting download page to ${dest}`);
  new targz().extract(source, dest, (err) => {
    if (err) {
      console.log(err);
    }
    console.log('Update package extracted.');
    cb();
  });
}

gulp.task('getSonarr', () => {
  try {
    fs.mkdirSync('./_start/');
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e;
    }
  }

  getLatest((updatePackage) => {
    const packagePath = `./_start/${updatePackage.filename}`;
    const dirName = `./_start/${updatePackage.version}`;
    download(updatePackage.url, packagePath, () => {
      extract(packagePath, dirName, () => {
        // clean old binaries
        console.log('Cleaning old binaries');
        del.sync(['./_output/*', '!./_output/UI/']);
        console.log('copying binaries to target');
        gulp.src(`${dirName}/NzbDrone/*.*`)
          .pipe(gulp.dest('./_output/'));
      });
    });
  });
});

gulp.task('startSonarr', () => {
  const ls = spawn('mono', ['--debug', './_output/NzbDrone.exe']);

  ls.stdout.on('data', (data) => {
    process.stdout.write(data);
  });

  ls.stderr.on('data', (data) => {
    process.stdout.write(data);
  });

  ls.on('close', (code) => {
    console.log(`child process exited with code ${code}`);
  });
});
