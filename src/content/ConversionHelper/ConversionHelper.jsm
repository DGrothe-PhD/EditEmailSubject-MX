/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 *
 * Portions Copyright (C) Philipp Kewisch (2009-2019)
 * and John Bieling (2020) */

"use strict";

var EXPORTED_SYMBOLS = ["ConversionHelper"];

var ConversionHelper = {
  
  context: null,
  startupCompleted: false,
  promises: [],
  
  // Called from legacy code to wait until startup completed
  webExtensionStartupCompleted: function(msg) {
    if (this.startupCompleted) {
      console.log("WX startup already completed. Continuing. [" + msg + "]");
      return;
    }
    
    console.log("WX startup not yet completed. Pausing. [" + msg + "]");
    return new Promise(resolve => {
      this.promises.push({resolve, msg});
    });
  },
  
  // Called from WX code to set startupCompleted
  notifyStartupComplete: function() {
    this.startupCompleted = true;
    // Run through all pending promises and fullfill them
    for (const p of this.promises){
      console.log("WX startup now completed. Continuing. [" + p.msg + "]");
      p.resolve();
    }  
  },

  
  
  
  getWXAPI(name, sync = true) {
    let that = this;
    
    function implementation(api) {
      let impl = api.getAPI(that.context)[name];

      if (name == "storage") {
        impl.local.get = (...args) => impl.local.callMethodInParentProcess("get", args);
        impl.local.set = (...args) => impl.local.callMethodInParentProcess("set", args);
        impl.local.remove = (...args) => impl.local.callMethodInParentProcess("remove", args);
        impl.local.clear = (...args) => impl.local.callMethodInParentProcess("clear", args);
      }
      return impl;
    }

    if (!this.context) {
      throw new Error("Extension context not set. Please call browser.ConversionHelper.init(aPath) first!");
    }
    
    let extension = this.context.extension;
    
    if (sync) {
      let api = extension.apiManager.getAPI(name, extension, "addon_parent");
      return implementation(api);
    } else {
      return extension.apiManager.asyncGetAPI(name, extension, "addon_parent").then((api) => {
        return implementation(api);
      });
    }
  },
  
  // Convenient getters to be able to use ConversionHelper.<apiname>.* in the same way as browser.<apiname>.*
  // Not really needed. One could also use ConversionHelper.getWXAPI(<apiname>).*
  get i18n() { 
    return ConversionHelper.getWXAPI("i18n");
  },
  
  get storage() {
    return ConversionHelper.getWXAPI("storage");
  }
}
