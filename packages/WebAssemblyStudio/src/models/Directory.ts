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
import { Minimatch } from "minimatch";
import { File } from "./File";
import { EventDispatcher } from "./EventDispatcher";
import { FileType } from "./types";
import { ContentsManager } from "@jupyterlab/services";
import { extensionForFileType, fileTypeFromFileName } from "../models";

export class Directory extends File {
  name: string;
  base: string;
  contentsManager: ContentsManager;
  parent: Directory;
  isOpen: boolean = true;
  readonly onDidChangeChildren = new EventDispatcher("Directory Changed ");
  constructor(name: string, base: string, contentsManager?: ContentsManager, parent: Directory = null) {
    super(name, FileType.Directory, contentsManager, parent);
    this.contentsManager = contentsManager;
    this.base = base;
    this.parent = parent;
  }
  children(): Promise<File[]> {
    if (this.contentsManager) {
      const folderContents = this.contentsManager.get(this.base).then(contents => {
        return contents.content.map((f: any) => {
          const base = this.base + (this.base.length > 0 ? "/" : "") + f.name;
          if (f.type === "file") {
            return new File(f.name, fileTypeFromFileName(f.name), this.contentsManager, this);
          } else if (f.type === "notebook") {
            return new File(f.name, FileType.JupyterNotebook, this.contentsManager, this);
          } else {
            const folderBase = this.base + (this.base.length > 1 ? "/" : "") + f.name;
            return new Directory(f.name, folderBase, this.contentsManager, this);
          }
        });
      });
      return folderContents;
    }
    return Promise.all([]);
  }
  notifyDidChangeChildren(file: File) {
    let directory: Directory = this;
    while (directory) {
      directory.onDidChangeChildren.dispatch();
      directory = directory.parent;
    }
  }
  forEachFile(fn: (file: File) => void, excludeTransientFiles = false, recurse = false) {
    this.children().then(children => {
      if (recurse) {
        children.forEach((file: File) => {
          if (excludeTransientFiles && file.isTransient) {
            return false;
          }
          if (file instanceof Directory) {
            file.forEachFile(fn, excludeTransientFiles, recurse);
          } else {
            fn(file);
          }
        });
      } else {
        children.forEach(fn);
      }
    });
  }
  async mapEachFile<T>(fn: (file: File) => T, excludeTransientFiles = false): Promise<T[]> {
    const children = await this.children();
    return children.filter((file: File) => {
      if (excludeTransientFiles && file.isTransient) {
        return false;
      }
      return true;
    }).map(fn);
  }
  async handleNameCollision(name: string, isDirectory?: boolean) {
    const children = await this.children();
    for (let i = 1; i <= children.length; i++) {
      const nameParts = name.split(".");
      const extension = nameParts.pop();
      let newName;
      if (isDirectory) {
        newName = `${name}${i + 1}`;
      } else {
        newName = `${nameParts.join(".")}.${i + 1}.${extension}`;
      }
      if (!(await this.getImmediateChild(newName))) {
        return newName;
      }
    }
    throw new Error("Name collision not handled");
  }
  async addFile(file: File) {
    // TODO: handle nested files
    assert(file.parent === null);
    if ((await this.getImmediateChild(file.name))) {
      file.name = await this.handleNameCollision(file.name, file instanceof Directory);
    }
    if (this.contentsManager) {
      const getType = (file: File) => {
        if (file instanceof Directory) {
          return "directory";
        } else if (file.type === FileType.JupyterNotebook) {
          return "notebook";
        }
        return "file";
      };
      const path = await this.contentsManager.newUntitled({ path: this.base, type: getType(file), ext: extensionForFileType(file.type) }).then(model => {
        return model.path;
      });
      const name = this.base.length  > 0 ? this.base + "/" + file.name : file.name;
      this.contentsManager.rename(path, name); // TODO: handle name collisions
      console.log(path);
    }
    file.parent = this;
    this.notifyDidChangeChildren(file);
  }
  async removeFile(file: File) {
    const children = await this.children();
    assert(file.parent === this);
    const i = children.indexOf(file);
    await this.contentsManager.delete(file.jupyterName);
    file.parent = null;
    this.notifyDidChangeChildren(file);
  }
  async newDirectory(dirName: string): Promise<Directory> {
    // if (typeof path === "string") {
    //   path = path.split("/");
    // }
    // let directory: Directory = this;
    const file = new Directory(dirName, name, this.contentsManager);
    this.addFile(file);
    const directory = file as Directory;
    // while (path.length) {
    //   const name = path.shift();
    //   let file = await directory.getImmediateChild(name);
    //   if (file) {
    //     directory = file as Directory;
    //   } else {
    //     file = new Directory(name, name, this.contentsManager);
    //     directory.addFile(file);
    //     directory = file as Directory;
    //   }
    // }
    assert(directory instanceof Directory);
    return directory;
  }
  async newFile(name: string, type: FileType): Promise<File> {
    let file;
    if (type === FileType.Directory) {
      file = new Directory(name, this.jupyterName, this.contentsManager);
      this.addFile(file);
    } else {
      file = new File(name, type, this.contentsManager);
      this.addFile(file);
    }
    return file;
  }
  async getImmediateChild(name: string): Promise<File> {
    const children = await this.children();
    return children.find((file: File) => {
      return file.name === name;
    });
  }
  async getFile(path: string | string[]): Promise<File> {
    if (typeof path === "string") {
      path = path.split("/");
    }
    const file = await this.getImmediateChild(path[0]);
    if (path.length > 1) {
      if (file && file.type === FileType.Directory) {
        return (file as Directory).getFile(path.slice(1));
      } else {
        return null;
      }
    }
    return file;
  }
  list(): string[] {
    const list: string[] = [];
    function recurse(prefix: string, x: Directory) {
      if (prefix) {
        prefix += "/";
      }
      x.forEachFile(file => {
        const path = prefix + file.name;
        if (file instanceof Directory) {
          recurse(path, file);
        } else {
          list.push(path);
        }
      });
    }
    recurse("", this);
    return list;
  }
  glob(pattern: string): string[] {
    const mm = new Minimatch(pattern);
    return this.list().filter(path => mm.match(path));
  }
  // async globFiles(pattern: string): Promise<File[]> {
  //   async function
  //   return this.glob(pattern).map(this.getFile);
  // }
  async hasChildren() {
    return (await this.children()).length > 0;
  }
}
