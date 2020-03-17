// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

import { Widget } from '@lumino/widgets';
import * as React from 'react';

import {
  showDialog,
  Dialog,
  Toolbar,
  ToolbarButtonComponent,
  UseSignal,
  addToolbarButtonClass,
  ReactWidget,
  ToolbarButton,
  ISessionContextDialogs
} from '@jupyterlab/apputils';
import { DocumentRegistry } from '@jupyterlab/docregistry';
import * as nbformat from '@jupyterlab/nbformat';
import {
  Button,
  HTMLSelect,
  addIcon,
  bugIcon,
  keyboardIcon,
  copyIcon,
  cutIcon,
  pasteIcon,
  runIcon,
  saveIcon
} from '@jupyterlab/ui-components';

import { NotebookActions } from './actions';
import { NotebookPanel } from './panel';
import { Notebook } from './widget';

/**
 * The class name added to toolbar cell type dropdown wrapper.
 */
const TOOLBAR_CELLTYPE_CLASS = 'jp-Notebook-toolbarCellType';

/**
 * The class name added to toolbar cell type dropdown.
 */
const TOOLBAR_CELLTYPE_DROPDOWN_CLASS = 'jp-Notebook-toolbarCellTypeDropdown';

/**
 * A namespace for the default toolbar items.
 */
export namespace ToolbarItems {
  /**
   * Create save button toolbar item.
   */
  export function createSaveButton(panel: NotebookPanel): Widget {
    function onClick() {
      if (panel.context.model.readOnly) {
        return showDialog({
          title: 'Cannot Save',
          body: 'Document is read-only',
          buttons: [Dialog.okButton()]
        });
      }
      void panel.context.save().then(() => {
        if (!panel.isDisposed) {
          return panel.context.createCheckpoint();
        }
      });
    }
    return addToolbarButtonClass(
      ReactWidget.create(
        <UseSignal signal={panel.context.fileChanged}>
          {() => (
            <ToolbarButtonComponent
              icon={saveIcon}
              onClick={onClick}
              tooltip="Save the notebook contents and create checkpoint"
              enabled={
                !!(
                  panel &&
                  panel.context &&
                  panel.context.contentsModel &&
                  panel.context.contentsModel.writable
                )
              }
            />
          )}
        </UseSignal>
      )
    );
  }

  /**
   * Create an insert toolbar item.
   */
  export function createInsertButton(panel: NotebookPanel): Widget {
    return new ToolbarButton({
      icon: addIcon,
      onClick: () => {
        NotebookActions.insertBelow(panel.content);
      },
      tooltip: 'Insert a cell below'
    });
  }

  /**
   * Create a cut toolbar item.
   */
  export function createCutButton(panel: NotebookPanel): Widget {
    return new ToolbarButton({
      icon: cutIcon,
      onClick: () => {
        NotebookActions.cut(panel.content);
      },
      tooltip: 'Cut the selected cells'
    });
  }

  /**
   * Create a copy toolbar item.
   */
  export function createCopyButton(panel: NotebookPanel): Widget {
    return new ToolbarButton({
      icon: copyIcon,
      onClick: () => {
        NotebookActions.copy(panel.content);
      },
      tooltip: 'Copy the selected cells'
    });
  }

  /**
   * Create a paste toolbar item.
   */
  export function createPasteButton(panel: NotebookPanel): Widget {
    return new ToolbarButton({
      icon: pasteIcon,
      onClick: () => {
        NotebookActions.paste(panel.content);
      },
      tooltip: 'Paste cells from the clipboard'
    });
  }

  /**
   * Create a run toolbar item.
   */
  export function createRunButton(panel: NotebookPanel): Widget {
    return new ToolbarButton({
      icon: runIcon,
      onClick: () => {
        void NotebookActions.runAndAdvance(panel.content, panel.sessionContext);
      },
      tooltip: 'Run the selected cells and advance'
    });
  }

  /**
   * Create a cell type switcher item.
   *
   * #### Notes
   * It will display the type of the current active cell.
   * If more than one cell is selected but are of different types,
   * it will display `'-'`.
   * When the user changes the cell type, it will change the
   * cell types of the selected cells.
   * It can handle a change to the context.
   */
  export function createCellTypeItem(panel: NotebookPanel): Widget {
    return new CellTypeSwitcher(panel.content);
  }

  /**
   * Create an insert code toolbar item.
   */
  export function createCodeButton(panel: NotebookPanel): Widget {
    function onClickLoadDataset() {
      NotebookActions.insertMinioCode(panel.content, 1);
      Dialog.close();
    }

    function onClickSaveDataset() {
      NotebookActions.insertMinioCode(panel.content, 2);
      Dialog.close();
    }

    function onClickLoadModel() {
      NotebookActions.insertMinioCode(panel.content, 3);
      Dialog.close();
    }

    function onClickSaveModel() {
      NotebookActions.insertMinioCode(panel.content, 4);
      Dialog.close();
    }

    let body = (
      <div>
        <h4>Minio Group</h4>
        <Button fill onClick={onClickLoadDataset}>
          Load dataset
        </Button>
        <Button fill onClick={onClickSaveDataset}>
          Save dataset
        </Button>
        <Button fill onClick={onClickLoadModel}>
          Load model
        </Button>
        <Button fill onClick={onClickSaveModel}>
          Save model
        </Button>
      </div>
    );

    return new ToolbarButton({
      icon: bugIcon,
      onClick: () => {
        showDialog({
          title: 'Code palette',
          body,
          buttons: [Dialog.cancelButton()]
        });
      },
      tooltip: 'Open code palette'
    });
  }

  /**
   * Create an insert new parameter toolbar item.
   */
  export function createNewParameterButton(panel: NotebookPanel): Widget {
    const newParam = { name: '', value: '', type: '' };

    function showParamDialog() {
      let body = (
        <div>
          <div>
            <label>Name:</label>
            <br />
            <input
              defaultValue={newParam.name}
              onChange={e => {
                newParam.name = e.target.value.trim();
              }}
            />
          </div>
          <br />
          <div>
            <label>Default value:</label>
            <br />
            <input
              defaultValue={newParam.value}
              onChange={e => {
                newParam.value = e.target.value.trim();
              }}
            />
          </div>
          <br />
          <div>
            <label>Type:</label>
            <select
              defaultValue={newParam.type}
              onChange={e => {
                newParam.type = e.target.value;
              }}
            >
              <option value=""></option>
              <option value="integer">Integer</option>
              <option value="number">Number</option>
              <option value="string">String</option>
            </select>
          </div>
        </div>
      );
      showDialog({
        title: 'New parameter',
        body,
        buttons: [Dialog.cancelButton(), Dialog.okButton({ label: 'Create' })]
      }).then(result => {
        if (result.button.accept) {
          if (!newParam.name || !newParam.value || !newParam.type) {
            showDialog({
              title: 'Cannot create new parameter',
              body: 'Values missing',
              buttons: [Dialog.okButton()]
            }).then(result => {
              showParamDialog();
            });
          } else {
            const sValue =
              newParam.type == 'string'
                ? '"' + newParam.value + '"'
                : newParam.value;
            const sType = ' #@param {type:"' + newParam.type + '"}';
            const sParam = newParam.name + ' = ' + sValue + sType;
            NotebookActions.insertNewParam(panel.content, sParam);
          }
        }
      });
    }

    return new ToolbarButton({
      icon: keyboardIcon,
      tooltip: 'Open new parameter',
      onClick: () => {
        // reset the values
        newParam.name = '';
        newParam.value = '';
        newParam.type = '';
        showParamDialog();
      }
    });
  }

  /**
   * Get the default toolbar items for panel
   */
  export function getDefaultItems(
    panel: NotebookPanel,
    sessionDialogs?: ISessionContextDialogs
  ): DocumentRegistry.IToolbarItem[] {
    return [
      { name: 'save', widget: createSaveButton(panel) },
      { name: 'insert', widget: createInsertButton(panel) },
      { name: 'cut', widget: createCutButton(panel) },
      { name: 'copy', widget: createCopyButton(panel) },
      { name: 'paste', widget: createPasteButton(panel) },
      { name: 'run', widget: createRunButton(panel) },
      {
        name: 'interrupt',
        widget: Toolbar.createInterruptButton(panel.sessionContext)
      },
      {
        name: 'restart',
        widget: Toolbar.createRestartButton(
          panel.sessionContext,
          sessionDialogs
        )
      },
      { name: 'cellType', widget: createCellTypeItem(panel) },
      { name: 'code', widget: createCodeButton(panel) },
      { name: 'newParameter', widget: createNewParameterButton(panel) },
      { name: 'spacer', widget: Toolbar.createSpacerItem() },
      {
        name: 'kernelName',
        widget: Toolbar.createKernelNameItem(
          panel.sessionContext,
          sessionDialogs
        )
      },
      {
        name: 'kernelStatus',
        widget: Toolbar.createKernelStatusItem(panel.sessionContext)
      }
    ];
  }
}

/**
 * A toolbar widget that switches cell types.
 */
export class CellTypeSwitcher extends ReactWidget {
  /**
   * Construct a new cell type switcher.
   */
  constructor(widget: Notebook) {
    super();
    this.addClass(TOOLBAR_CELLTYPE_CLASS);
    this._notebook = widget;
    if (widget.model) {
      this.update();
    }
    widget.activeCellChanged.connect(this.update, this);
    // Follow a change in the selection.
    widget.selectionChanged.connect(this.update, this);
  }

  /**
   * Handle `change` events for the HTMLSelect component.
   */
  handleChange = (event: React.ChangeEvent<HTMLSelectElement>): void => {
    if (event.target.value !== '-') {
      NotebookActions.changeCellType(
        this._notebook,
        event.target.value as nbformat.CellType
      );
      this._notebook.activate();
    }
  };

  /**
   * Handle `keydown` events for the HTMLSelect component.
   */
  handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.keyCode === 13) {
      this._notebook.activate();
    }
  };

  render() {
    let value = '-';
    if (this._notebook.activeCell) {
      value = this._notebook.activeCell.model.type;
    }
    for (let widget of this._notebook.widgets) {
      if (this._notebook.isSelectedOrActive(widget)) {
        if (widget.model.type !== value) {
          value = '-';
          break;
        }
      }
    }
    return (
      <HTMLSelect
        className={TOOLBAR_CELLTYPE_DROPDOWN_CLASS}
        onChange={this.handleChange}
        onKeyDown={this.handleKeyDown}
        value={value}
        aria-label="Cell type"
      >
        <option value="-">-</option>
        <option value="code">Code</option>
        <option value="markdown">Markdown</option>
        <option value="raw">Raw</option>
      </HTMLSelect>
    );
  }

  private _notebook: Notebook;
}
