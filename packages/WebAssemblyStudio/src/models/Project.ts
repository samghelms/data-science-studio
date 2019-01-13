/* Copyright 2018 Mozilla Foundation
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { assert } from "../util";
import { EventDispatcher } from "./EventDispatcher";
import { Directory } from "./Directory";
import { ContentsManager, ServiceManager } from "@jupyterlab/services";
import { CommandRegistry } from "@phosphor/commands";
import {
  RenderMimeRegistry,
  standardRendererFactories as initialFactories
} from "@jupyterlab/rendermime";
import { CommandPalette, Widget } from "@phosphor/widgets";
import { DocumentManager } from "@jupyterlab/docmanager";
import { DocumentRegistry } from "@jupyterlab/docregistry";
import {
  NotebookPanel,
  NotebookWidgetFactory,
  NotebookModelFactory,
  NotebookActions
} from "@jupyterlab/notebook";
import { editorServices } from "@jupyterlab/codemirror";

export class Project extends Directory {
  serviceManager: ServiceManager;
  docManager: DocumentManager;
  onDidChangeStatus = new EventDispatcher("Status Change");
  onChange = new EventDispatcher("Project Change");
  onDirtyFileUsed = new EventDispatcher("Dirty File Used");

  constructor(contentsManager?: ContentsManager, serviceManager?: ServiceManager) {
    super("", "", contentsManager);
    this.serviceManager = serviceManager;

    if (serviceManager) {
      const rendermime = new RenderMimeRegistry({ initialFactories });

      const opener = {
          open: (widget: Widget) => {
          // Do nothing for sibling widgets for now.
          }
      };
      const docRegistry = new DocumentRegistry();
      this.docManager = new DocumentManager({
          registry: docRegistry,
          manager: serviceManager,
          opener
      });
      const mFactory = new NotebookModelFactory({});
      const editorFactory = editorServices.factoryService.newInlineEditor;
      const contentFactory = new NotebookPanel.ContentFactory({ editorFactory });

      const wFactory = new NotebookWidgetFactory({
          name: "Notebook",
          modelName: "notebook",
          fileTypes: ["notebook"],
          defaultFor: ["notebook"],
          preferKernel: true,
          canStartKernel: true,
          rendermime,
          contentFactory,
          mimeTypeService: editorServices.mimeTypeService
      });

      docRegistry.addModelFactory(mFactory);
      docRegistry.addWidgetFactory(wFactory);
    }
  }

  private status: string [] = ["Idle"];
  hasStatus() {
    return this.status.length > 1;
  }
  getStatus() {
    if (this.hasStatus()) {
      return this.status[this.status.length - 1];
    }
    return "";
  }
  pushStatus(status: string) {
    this.status.push(status);
    this.onDidChangeStatus.dispatch();
  }
  popStatus() {
    assert(this.status.length);
    this.status.pop();
    this.onDidChangeStatus.dispatch();
  }
  openNotebook(fileName: string) {
    const nbWidget = this.docManager.openOrReveal(fileName) as NotebookPanel;
    return nbWidget;
  }
}
