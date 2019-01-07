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

import * as React from "react";
import { Service, IFiddleFile } from "../service";
import * as ReactModal from "react-modal";
import { Button } from "./shared/Button";
import { GoGear, GoFile, GoX, Icon } from "./shared/Icons";
import { KeyboardEvent, ChangeEvent, ChangeEventHandler } from "react";
import { ListBox, ListItem, TextInputBox } from "./Widgets";
import fetchTemplates from "../utils/fetchTemplates";
import getConfig from "../config";
import { ServerConnection, Kernel } from "@jupyterlab/services";
import * as Url from "url-parse";
// export interface KernelTemplate {
//   name: string;
//   description: string;
//   files: IFiddleFile[];
//   baseUrl: URL;
//   icon: string;
// }

export class NewKernelDialog extends React.Component<{
  isOpen: boolean;
  templatesName: string;
  onCreate: (serverAddress: ServerConnection.ISettings) => void;
  onCancel: () => void;
}, {
    description: string;
    name: string;
    jupyterServerAddress: string;
    // template: Template;
    // templates: Template [];
  }> {
  constructor(props: any) {
    super(props);
    this.state = {
    //   template: null,
      description: "",
      name: "",
      jupyterServerAddress: ""
    //   templates: []
    };
  }
  async componentDidMount() {
    const config = await getConfig();
    // const templatesPath = config.templates[this.props.templatesName];
    // const json = await fetchTemplates(templatesPath);
    // const base = new URL(templatesPath, location.href);
    // const templates: Template[] = [];
    // for (const [ key, entry] of Object.entries(json) as any) {
    //   const name = entry.name || "";
    //   const description = entry.description || "";
    //   const icon = entry.icon || "";
    //   templates.push({
    //     name,
    //     description,
    //     icon,
    //     files: entry.files,
    //     baseUrl: new URL(key + "/", base)
    //   });
    // }

    // this.setState({templates});
    // this.setTemplate(templates[0]);
  }
//   async setTemplate(template: Template) {
//     const description = await Service.compileMarkdownToHtml(template.description);
//     this.setState({template, description});
//   }
  onCreate(jupyterServerAddress: string) {
      // TODO: add validation that this is actually a jupyter server here
    const parsedAddress = new Url(jupyterServerAddress, null, true);
    const baseUrl = `${parsedAddress.protocol}//${parsedAddress.host}`;
    const wsUrl = `ws://${parsedAddress.host}`;
    const settings = ServerConnection.makeSettings(
        {
            baseUrl: baseUrl,
            wsUrl: wsUrl,
            token: parsedAddress.query["token"]
        }
    );
    this.props.onCreate(settings);
  }

  updateServerUrl(jupyterServerAddress: any) {
    this.setState({jupyterServerAddress: jupyterServerAddress});
  }

  render() {
    return <ReactModal
      isOpen={this.props.isOpen}
      contentLabel="Create New Project"
      className="modal show-file-icons"
      overlayClassName="overlay"
      ariaHideApp={false}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <div className="modal-title-bar">
          Connect to a Kernel
        </div>
        <input autoFocus onChange={(e) => this.updateServerUrl(e.target.value)} placeholder="enter a jupyter server url (for example, http://localhost:8080)" className="text-input-box"/>
        <div style={{ flex: 1, padding: "8px" }}/>
        <div>
          <Button
            icon={<GoX />}
            label="Cancel"
            title="Cancel"
            onClick={() => {
              this.props.onCancel();
            }}
          />
          <Button
            icon={<GoFile />}
            label="Connect"
            title="Connect"
            onClick={() => {
              return this.props.onCreate && this.onCreate(this.state.jupyterServerAddress);
            }}
          />
        </div>
      </div>
    </ReactModal>;
  }
}
