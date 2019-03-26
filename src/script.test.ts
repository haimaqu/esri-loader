/* tslint:disable only-arrow-functions */
import { isLoaded, loadScript } from './script';

declare global {
  /* tslint:disable interface-name */
  interface Window {
    require?: any;
    dojoConfig?: any;
    stubRequire?: any;
  }
  /* tslint:enable interface-name */
}

// helper functions
// stub require function
window.stubRequire = function() {
  window.require = function(moduleNames, callback) {
    if (callback) {
      // call the callback w/ the modulenames that were passed in
      callback.apply(this, moduleNames);
    }
  };
  window.require.on = function(name, callback) {
    return {
      /* tslint:disable no-empty */
      remove() {}
      /* tslint:enable no-empty */
    };
  };
};

// remove script tags added by esri-loader
function removeScript() {
  const script = document.querySelector('script[data-esri-loader]');
  if (script) {
    script.parentElement.removeChild(script);
  }
}
// remove previously stubbed require function
function removeRequire() {
  delete window.require;
}

const jaspi3xUrl = 'base/test/mocks/jsapi3x.js';

describe('isLoaded', function() {
  describe('when has not yet been loaded', function() {
    beforeEach(function() {
      removeRequire();
      removeScript();
    });
    it('isLoaded should be false', function() {
      expect(isLoaded()).toBeFalsy();
    });
  });
});

describe('when loading the script', function() {
  describe('with defaults', function() {
    let scriptEl;
    beforeAll(function(done) {
      spyOn(document.body, 'appendChild').and.callFake(function(el) {
        // trigger the onload event listeners
        el.dispatchEvent(new Event('load'));
      });
      spyOn(document.head, 'appendChild');
      loadScript()
      .then((script) => {
        // hold onto script element for assertions below
        scriptEl = script;
        done();
      });
    });
    it('should default to latest version', function() {
      expect(scriptEl.src).toEqual('https://js.arcgis.com/4.10/');
    });
    it('should not have set dojoConfig', function() {
      expect(window.dojoConfig).not.toBeDefined();
    });
    it('should not have called loadCss', function() {
      expect((document.head.appendChild as jasmine.Spy).calls.any()).toBeFalsy();
    });
  });
  describe('with different API version', function() {
    let scriptEl;
    beforeAll(function(done) {
      spyOn(document.body, 'appendChild').and.callFake(function(el) {
        // trigger the onload event listeners
        el.dispatchEvent(new Event('load'));
      });
      loadScript({
        url: 'https://js.arcgis.com/3.27'
      })
      .then((script) => {
        // hold onto script element for assertions below
        scriptEl = script;
        done();
      });
    });
    it('should load different version', function() {
      expect(scriptEl.src).toEqual('https://js.arcgis.com/3.27');
    });
    it('should not have set dojoConfig', function() {
      expect(window.dojoConfig).not.toBeDefined();
    });
  });
  describe('with css option', function() {
    const cssUrl = 'https://js.arcgis.com/4.10/esri/css/main.css';
    beforeAll(function(done) {
      spyOn(document.body, 'appendChild').and.callFake(function(el) {
        // trigger the onload event listeners
        el.dispatchEvent(new Event('load'));
      });
      spyOn(document.head, 'appendChild').and.stub();
      loadScript({
        css: cssUrl
      })
      .then((script) => {
        done();
      });
    });
    it('should have called loadCss with the url', function() {
      expect((document.head.appendChild as jasmine.Spy).calls.argsFor(0)[0].href).toEqual(cssUrl);
    });
  });
  describe('with dojoConfig option', function() {
    const dojoConfig = {
      async: true,
      packages: [
        {
          location: 'path/to/somelib',
          name: 'somelib'
        }
      ]
    };
    beforeAll(function(done) {
      spyOn(document.body, 'appendChild').and.callFake(function(el) {
        // trigger the onload event listeners
        el.dispatchEvent(new Event('load'));
      });
      loadScript({
        dojoConfig
      })
      .then((script) => {
        done();
      });
    });
    it('should have set global dojoConfig', function() {
      expect(window.dojoConfig).toEqual(dojoConfig);
    });
    afterAll(function() {
      window.dojoConfig = undefined;
    });
  });
  describe('when already loaded by some other means', function() {
    beforeAll(function() {
      window.stubRequire();
    });
    it('should reject', function(done) {
      loadScript({
        url: jaspi3xUrl
      })
      .then(() => {
        done.fail('call to loadScript should have failed');
      })
      .catch((err) => {
        expect(err.message).toEqual(`The ArcGIS API for JavaScript is already loaded.`);
        done();
      });
    });
    afterAll(function() {
      // clean up
      removeRequire();
    });
  });
  describe('when loading an invalid url', function() {
    it('should pass an error to the callback', function(done) {
      loadScript({
        url: 'not a valid url'
      })
      .then(() => {
        done.fail('call to loadScript should have failed');
      })
      .catch((err) => {
        expect(err.message.indexOf('There was an error attempting to load')).toEqual(0);
        done();
      });
    });
    afterAll(function() {
      // clean up
      removeScript();
    });
  });
  describe('when called twice', function() {
    describe('when loading the same script', function() {
      it('should resolve the script if it is already loaded', function(done) {
        loadScript({
          url: jaspi3xUrl
        })
        .then(() => {
          // try loading the same script after the first one has already loaded
          loadScript({
            url: jaspi3xUrl
          })
          .then((script) => {
            expect(script.getAttribute('src')).toEqual(jaspi3xUrl);
            done();
          })
          .catch((err) => {
            done.fail('second call to loadScript should not have failed with: ' + err);
          });
        })
        .catch(() => {
          done.fail('first call to loadScript should not have failed');
        });
      });
      it('should resolve an unloaded script once it loads', function(done) {
        loadScript({
          url: jaspi3xUrl
        })
        .catch(() => {
          done.fail('first call to loadScript should not have failed');
        });
        // try loading the same script again
        loadScript({
          url: jaspi3xUrl
        })
        .then((script) => {
          expect(script.getAttribute('src')).toEqual(jaspi3xUrl);
          done();
        })
        .catch((err) => {
          done.fail('second call to loadScript should not have failed with: ' + err);
        });
      });
    });
    describe('when loading different scripts', function() {
      it('should reject', function(done) {
        loadScript({
          url: jaspi3xUrl
        })
        .catch(() => {
          done.fail('first call to loadScript should not have failed');
        });
        // try loading a different script
        loadScript({
          url: 'base/test/mocks/jsapi4x.js'
        })
        .then(() => {
          done.fail('second call to loadScript should have failed');
        })
        .catch((err) => {
          expect(err.message).toEqual(`The ArcGIS API for JavaScript is already loaded (${jaspi3xUrl}).`);
          done();
        });
      });
    });
    afterEach(function() {
      // clean up
      removeRequire();
      removeScript();
    });
  });
});
