import * as React from "react";
import * as ReactDOM from "react-dom/client";
import { Grid } from "./Grid";

interface IInputs {
  dataset: ComponentFramework.PropertyTypes.DataSet;
}

export class CustomGridB2E implements ComponentFramework.StandardControl<
  IInputs,
  Record<string, never>
> {
  private container: HTMLDivElement;
  private root: ReactDOM.Root;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.container = container;
    this.root = ReactDOM.createRoot(container);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.root.render(
      React.createElement(Grid, {
        dataset: context.parameters.dataset,
        context: context // ✅ REQUIRED
      })
    );
  }

  public getOutputs(): Record<string, never> {
    return {};
  }

  public destroy(): void {
    this.root.unmount();
  }
}