import { Workspace, panelNode } from "./workspace.ts";
import { App } from "./ui/app.tsx";
import { Workspace } from "./workspace.ts";
import { Backend } from "./backend/mod.ts";
import { component } from "./manifold/components.ts";

export { BrowserBackend, SearchIndex_MiniSearch} from "./backend/browser.ts";
export { GitHubBackend } from "./backend/github.ts";

@component
export class Checkbox {
  checked: boolean;

  constructor() {
    this.checked = false;
  }
}

@component
export class Page {
  markdown: string;

  constructor() {
    this.markdown = "";
  }
}


export async function setup(document: Document, target: HTMLElement, backend: Backend) {
  if (backend.initialize) {
    await backend.initialize();
  }
  const workspace = new Workspace(backend);
  window.workspace = workspace;
  await workspace.initialize();
  

  workspace.commands.registerCommand({
    id: "add-page",
    title: "Add page",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      const page = new Page();
      ctx.node.addComponent(page);
    }
  });

  workspace.commands.registerCommand({
    id: "remove-page",
    title: "Remove page",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      ctx.node.removeComponent(Page);
    }
  });

  workspace.commands.registerCommand({
    id: "add-checkbox",
    title: "Add checkbox",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      const checkbox = new Checkbox();
      ctx.node.addComponent(checkbox);
    }
  });

  workspace.commands.registerCommand({
    id: "remove-checkbox",
    title: "Remove checkbox",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      ctx.node.removeComponent(Checkbox);
    }
  });

  workspace.commands.registerCommand({
    id: "mark-done",
    title: "Mark done",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      if (ctx.node.hasComponent(Checkbox)) {
        const checkbox = ctx.node.getComponent(Checkbox);
        if (!checkbox.checked) {
          checkbox.checked = true;
          ctx.node.changed();
        } else {
          ctx.node.removeComponent(Checkbox);
        }
      } else {
        const checkbox = new Checkbox();
        ctx.node.addComponent(checkbox);
      }
    }
  });
  workspace.keybindings.registerBinding({command: "mark-done", key: "meta+enter" });



  workspace.commands.registerCommand({
    id: "expand",
    title: "Expand",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      workspace.setExpanded(ctx.node, true);
      m.redraw();
    }
  });
  workspace.keybindings.registerBinding({command: "expand", key: "meta+arrowdown" });
  workspace.commands.registerCommand({
    id: "collapse",
    title: "Collapse",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      workspace.setExpanded(ctx.node, false);
      m.redraw();
    }
  });
  workspace.keybindings.registerBinding({command: "collapse", key: "meta+arrowup" });
  workspace.commands.registerCommand({
    id: "indent",
    title: "Indent",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      const prev = panelNode(ctx.node.getPrevSibling(), ctx.node.panel);
      if (prev !== null) {
        ctx.node.setParent(prev);
        workspace.setExpanded(prev, true);

        const node = ctx.node; // redraw seems to unset ctx.node
        m.redraw.sync();
        workspace.focus(node);
      }
    }
  });
  workspace.keybindings.registerBinding({command: "indent", key: "tab"});
  workspace.commands.registerCommand({
    id: "outdent",
    title: "Outdent",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      const parent = panelNode(ctx.node.getParent(), ctx.node.panel);
      if (parent !== null && parent.ID !== "@root") {
        ctx.node.setParent(parent.getParent());
        ctx.node.setSiblingIndex(parent.getSiblingIndex()+1);
        if (parent.childCount() === 0) {
          workspace.setExpanded(parent, false);
        }
        
        const node = ctx.node; // redraw seems to unset ctx.node
        m.redraw.sync();
        workspace.focus(node);
      }
    }
  });
  workspace.keybindings.registerBinding({command: "outdent", key: "shift+tab"});
  workspace.commands.registerCommand({
    id: "insert-child",
    title: "Insert Child",
    action: (ctx: Context, name: string = "") => {
      if (!ctx.node) return;
      const node = workspace.nodes.new(name);
      node.setParent(ctx.node);
      if (ctx.node.panel) {
        workspace.setExpanded(ctx.node, true);
      }
      m.redraw.sync();
      workspace.focus(panelNode(node, ctx.node.panel), name.length);
    }
  });
  workspace.commands.registerCommand({
    id: "insert-before",
    title: "Insert Before",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      const node = workspace.nodes.new("");
      node.setParent(ctx.node.getParent());
      node.setSiblingIndex(ctx.node.getSiblingIndex());
      m.redraw.sync();
      workspace.focus(panelNode(node, ctx.node.panel));
    }
  });
  workspace.commands.registerCommand({
    id: "insert",
    title: "Insert Node",
    action: (ctx: Context, name: string = "") => {
      if (!ctx.node) return;
      const node = workspace.nodes.new(name);
      node.setParent(ctx.node.getParent());
      node.setSiblingIndex(ctx.node.getSiblingIndex()+1);
      m.redraw.sync();
      workspace.focus(panelNode(node, ctx.node.panel));
    }
  });
  workspace.keybindings.registerBinding({command: "insert", key: "shift+enter"});
  workspace.commands.registerCommand({
    id: "delete",
    title: "Delete node",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      const prev = ctx.node.getPrevSibling();
      ctx.node.destroy();
      m.redraw.sync();
      if (prev) {
        let pos = 0;
        if (ctx.event && ctx.event.key === "Backspace") {
          pos = prev.getName().length;
        }
        workspace.focus(panelNode(prev, ctx.node.panel), pos);
      }
    }
  });
  workspace.keybindings.registerBinding({command: "delete", key: "shift+meta+backspace" });
  workspace.commands.registerCommand({
    id: "prev",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      const above = workspace.findAbove(ctx.node);
      if (above) {
        workspace.focus(panelNode(above, ctx.node.panel));
      }
    }
  });
  workspace.keybindings.registerBinding({command: "prev", key: "arrowup"});
  workspace.commands.registerCommand({
    id: "next",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      const below = workspace.findBelow(ctx.node);
      if (below) {
        workspace.focus(panelNode(below, ctx.node.panel));
      }
    }
  });
  workspace.keybindings.registerBinding({command: "next", key: "arrowdown"});
  workspace.commands.registerCommand({
    id: "pick-command",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      const trigger = workspace.getInput(ctx.node);
      const rect = trigger.getBoundingClientRect();
      const x = document.body.scrollLeft+rect.x+(trigger.selectionStart * 10)+20;
      const y = document.body.scrollTop+rect.y-8;
      workspace.showPalette(x, y, workspace.newContext({node: ctx.node}));
    }
  });
  workspace.keybindings.registerBinding({command: "pick-command", key: "meta+k"});
  workspace.commands.registerCommand({
    id: "new-panel",
    title: "Open in New Panel",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      workspace.openNewPanel(ctx.node);
      m.redraw();
    }
  });
  workspace.commands.registerCommand({
    id: "close-panel",
    title: "Close Panel",
    action: (ctx: Context, panel?: Panel) => {
      workspace.closePanel(panel || ctx.node.panel);
      m.redraw();
    }
  });
  workspace.commands.registerCommand({
    id: "zoom",
    title: "Open",
    action: (ctx: Context) => {
      ctx.node.panel.history.push(ctx.node);
      m.redraw();
    }
  });
  workspace.commands.registerCommand({
    id: "generate-random",
    title: "Generate Random Children",
    action: (ctx: Context) => {
      if (!ctx.node) return;
      [...Array(100)].forEach(() => {
        const node = workspace.nodes.new(generateName(8));
        node.setParent(ctx.node);
      });
    }
  });


  workspace.menus.registerMenu("node", [
    {command: "zoom"},
    {command: "new-panel"},
    {command: "indent"},
    {command: "outdent"},
    {command: "delete"},
    {command: "add-checkbox"}, // example when condition
    {command: "remove-checkbox"},
    {command: "mark-done"},
    {command: "add-page"},
    {command: "remove-page"},
    {command: "generate-random"},
  ]);

  workspace.menus.registerMenu("settings", [
    {title: () => `${workspace.backend.auth?.currentUser()?.userID()} @ GitHub`, disabled: true, when: () => workspace.authenticated()},
    {title: () => "Login with GitHub", when: () => !workspace.authenticated(), onclick: () => {
      if (!localStorage.getItem("github")) {
        workspace.showNotice("github", () => {
          workspace.backend.auth.login()
        })
      } else {
        workspace.backend.auth.login()
      }
    }},
    {title: () => "Reset Demo", when: () => !workspace.authenticated(), onclick: () => {
      localStorage.clear();
      location.reload();
    }},
    {title: () => "Submit Issue", onclick: () => window.open("https://github.com/treehousedev/treehouse/issues", "_blank")},
    {title: () => "Logout", when: () => workspace.authenticated(), onclick: () => workspace.backend.auth.logout()},
  ]);

  document.addEventListener("keydown", (e) => {
    const binding = workspace.keybindings.evaluateEvent(e);
    if (binding && workspace.context.node) {
      workspace.commands.executeCommand(binding.command, workspace.context);
      e.stopPropagation();
      e.preventDefault();
    }
  });

  document.addEventListener("click", (e) => {
    workspace.hideMenu();
  });


  m.mount(target, {view: () => m(App, {workspace})});
}



function generateName(length = 10) {
  const random = (min: any, max: any) => {
    return Math.round(Math.random() * (max - min) + min)
  };
  const word = () => {
    const words = [
      'got',
      'ability',
      'shop',
      'recall',
      'fruit',
      'easy',
      'dirty',
      'giant',
      'shaking',
      'ground',
      'weather',
      'lesson',
      'almost',
      'square',
      'forward',
      'bend',
      'cold',
      'broken',
      'distant',
      'adjective'
    ];
    return words[random(0, words.length - 1)];
  };
  const words = (length) => (
    [...Array(length)]
        .map((_, i) => word())
        .join(' ')
        .trim()
  );
  return words(random(2, length))
}