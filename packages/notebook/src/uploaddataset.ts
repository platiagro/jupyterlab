// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.
import axios from 'axios';

import { ToolbarButton, showErrorMessage } from '@jupyterlab/apputils';
import { FileBrowserModel } from '@jupyterlab/filebrowser';
import { fileUploadIcon } from '@jupyterlab/ui-components';

import { NotebookActions } from './actions';
import { Notebook } from './widget';

export const URL = '/datasets/apis';
export const datasetsApi = axios.create({
  baseURL: URL
});

/**
 * A widget which provides an upload button.
 */
export class UploaderDataset extends ToolbarButton {
  /**
   * Construct a new file browser buttons widget.
   */
  constructor(notebook: Notebook, options: Uploader.IOptions) {
    super({
      icon: fileUploadIcon,
      onClick: () => {
        this._input.click();
      },
      tooltip: 'Upload Dataset'
    });
    this.notebook = notebook;
    this.fileBrowserModel = options.model;
    this._input.onclick = this._onInputClicked;
    this._input.onchange = this._onInputChanged;
    this.addClass('jp-id-upload');
  }

  readonly notebook: Notebook;

  /**
   * The underlying file browser fileBrowserModel for the widget.
   *
   * This cannot be named model as that conflicts with the model property of VDomRenderer.
   */
  readonly fileBrowserModel: FileBrowserModel;

  /**
   * The 'change' handler for the input field.
   */
  private _onInputChanged = async () => {
    let files = Array.prototype.slice.call(this._input.files) as File[];
    let file = files[0];
    const response = await this.uploadDataset(file);
    if (response) {
      const value = response?.data.name;
      const param = `dataset = "${value}" #@param {type:"string"}`;
      NotebookActions.setDatasetParam(this.notebook, param);
    }
  };

  /**
   * Upload the user dataset.
   */
  private uploadDataset = async (file: File) => {
    try {
      var formData = new FormData();
      formData.append('file', file);
      const response = await datasetsApi.post(`/datasets`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response;
    } catch (error) {
      void showErrorMessage('Upload Error', error);
    }
  };

  /**
   * The 'click' handler for the input field.
   */
  private _onInputClicked = () => {
    // In order to allow repeated uploads of the same file (with delete in between),
    // we need to clear the input value to trigger a change event.
    this._input.value = '';
  };

  private _input = Private.createUploadInput();
}

/**
 * The namespace for Uploader class statics.
 */
export namespace Uploader {
  /**
   * The options used to create an uploader.
   */
  export interface IOptions {
    /**
     * A file browser fileBrowserModel instance.
     */
    model: FileBrowserModel;
  }
}

/**
 * The namespace for module private data.
 */
namespace Private {
  /**
   * Create the upload input node for a file buttons widget.
   */
  export function createUploadInput(): HTMLInputElement {
    let input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.multiple = false;
    return input;
  }
}
