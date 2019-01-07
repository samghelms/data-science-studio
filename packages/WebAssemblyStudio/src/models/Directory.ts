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
import { extensionForFileType } from "../models";

export class Directory extends File {
  name: string;
  base: string;
  contentsManager: ContentsManager;
  // children: File[] = [];
  isOpen: boolean = true;
  readonly onDidChangeChildren = new EventDispatcher("Directory Changed ");
  constructor(name: string, base: string, contentsManager?: ContentsManager) {
    super(name, FileType.Directory);
    this.contentsManager = contentsManager;
    this.base = base;
  }
  children(): Promise<File[]> {
    if (this.contentsManager) {
      const folderContents = this.contentsManager.get(this.base).then(contents => {
        return contents.content.map((f: any) => {
          if (f.type === "file") {
            // TODO: actually detect file type
            return new File(this.base + (this.base.length > 0 ? "/" : "") + f.name, FileType.JavaScript, this.contentsManager);
          } else if (f.type === "notebook") {
            return new File(this.base + (this.base.length > 0 ? "/" : "") + f.name, FileType.JupyterNotebook, this.contentsManager);
          } else {
            return new Directory(f.name, this.base + (this.base.length > 1 ? "/" : "") + f.name, this.contentsManager);
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
  handleNameCollision(name: string, isDirectory?: boolean) {
    for (let i = 1; i <= this.children.length; i++) {
      const nameParts = name.split(".");
      const extension = nameParts.pop();
      let newName;
      if (isDirectory) {
        newName = `${name}${i + 1}`;
      } else {
        newName = `${nameParts.join(".")}.${i + 1}.${extension}`;
      }
      if (!this.getImmediateChild(newName)) {
        return newName;
      }
    }
    throw new Error("Name collision not handled");
  }
  addFile(file: File) {
    assert(file.parent === null);
    if (this.getImmediateChild(file.name)) {
      file.name = this.handleNameCollision(file.name, file instanceof Directory);
    }
    // this.children.push(file); // TODO: actually implement this
    file.parent = this;
    this.notifyDidChangeChildren(file);
  }
  async removeFile(file: File) {
    const children = await this.children();
    assert(file.parent === this);
    const i = children.indexOf(file);
    assert(i >= 0);
    // children.splice(i, 1); // TODO: actually implement this
    file.parent = null;
    this.notifyDidChangeChildren(file);
  }
  async newDirectory(path: string | string[]): Promise<Directory> {
    if (typeof path === "string") {
      path = path.split("/");
    }
    let directory: Directory = this;
    while (path.length) {
      const name = path.shift();
      let file = await directory.getImmediateChild(name);
      if (file) {
        directory = file as Directory;
      } else {
        file = new Directory(name, name, this.contentsManager);
        directory.addFile(file);
        directory = file as Directory;
      }
    }
    assert(directory instanceof Directory);
    return directory;
  }
  async newFile(path: string | string[], type: FileType, isTransient = false, handleNameCollision = false): Promise<File> {
    if (typeof path === "string") {
      path = path.split("/");
    }
    let directory: Directory = this;
    if (path.length > 1) {
      directory = await this.newDirectory(path.slice(0, path.length - 1));
    }
    const name = path[path.length - 1];
    let file = await directory.getFile(name);
    if (file && !handleNameCollision) {
      assert(file.type === type);
    } else {
      file = new File(path[path.length - 1], type);
      directory.addFile(file);
    }
    file.isTransient = isTransient;
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
