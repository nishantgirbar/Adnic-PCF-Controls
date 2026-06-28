/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";

interface Contact {
    id: number;
    contactType: string;
    mobile: string;
    office: string;
    fax: string;
    email: string;
    website: string;
}

export class PolicyContactList implements ComponentFramework.StandardControl<IInputs, IOutputs> {

    private container!: HTMLDivElement;
    private contacts: Contact[] = [];
    private notifyOutputChanged!: () => void;
    private gridRef!: HTMLDivElement;
    private lastRaw: string | null = null;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {

        this.container = container;
        this.notifyOutputChanged = notifyOutputChanged;

        const wrapper = document.createElement("div");

        // Header
        const header = document.createElement("div");
        header.style.display = "flex";
        header.style.justifyContent = "space-between";
        header.style.alignItems = "center";
        header.style.marginBottom = "10px";

        const title = document.createElement("h3");
        title.innerText = "Contact";
        title.style.margin = "0";

        const addBtn = document.createElement("button");
        addBtn.innerText = "+ Add New";
        addBtn.style.padding = "6px 12px";
        addBtn.style.cursor = "pointer";

        addBtn.onclick = () => {
            const email = context.parameters.email?.raw || "";
            const mobile = context.parameters.contactnumber?.raw || "";
            this.addRow(email, mobile);
        };

        header.appendChild(title);
        header.appendChild(addBtn);

        this.gridRef = document.createElement("div");

        wrapper.appendChild(header);
        wrapper.appendChild(this.gridRef);

        this.container.appendChild(wrapper);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {

        const raw = context.parameters.contactlist.raw;

        if (raw !== this.lastRaw) {
            this.lastRaw = raw;

            try {
                this.contacts = raw ? JSON.parse(raw) : [];
            } catch {
                this.contacts = [];
            }
        }

        const email = context.parameters.email?.raw || "";
        const mobile = context.parameters.contactnumber?.raw || "";

        // Create initial row automatically
        if (this.contacts.length === 0 && (email || mobile)) {

            this.contacts.push({
                id: Date.now(),
                contactType: "Primary",
                mobile: mobile,
                office: "",
                fax: "",
                email: email,
                website: ""
            });

            this.notifyOutputChanged();
        }

        this.renderGrid();
    }

    private renderGrid(): void {

        this.gridRef.innerHTML = "";

        const grid = document.createElement("div");
        grid.className = "grid-container";

        const headers = [
            "#",
            "Contact Type",
            "Mobile",
            "Office",
            "Fax",
            "Email",
            "Website",
            "Action"
        ];

        headers.forEach(h => {
            const d = document.createElement("div");
            d.className = "grid-header";
            d.innerText = h;
            grid.appendChild(d);
        });

        this.contacts.forEach((row, idx) => {

            const cell = (el: HTMLElement | string) => {
                const d = document.createElement("div");
                d.className = "grid-cell";

                if (typeof el === "string") {
                    d.innerText = el;
                } else {
                    d.appendChild(el);
                }

                return d;
            };

            grid.appendChild(cell((idx + 1).toString()));

            // Contact Type
            const type = document.createElement("select");

            ["Primary", "Secondary"].forEach(v => {
                const o = document.createElement("option");
                o.value = v;
                o.text = v;

                if (v === row.contactType) {
                    o.selected = true;
                }

                type.appendChild(o);
            });

            type.onchange = () => {
                row.contactType = type.value;
                this.notifyOutputChanged();
            };

            grid.appendChild(cell(type));

            // Input Helper
            const createInput = (
                value: string,
                field: keyof Contact
            ) => {

                const input = document.createElement("input");
                input.value = value || "";
                input.style.width = "95%";

                input.onchange = () => {
                    (row as any)[field] = input.value;
                    this.notifyOutputChanged();
                };

                return input;
            };

            grid.appendChild(cell(createInput(row.mobile, "mobile")));
            grid.appendChild(cell(createInput(row.office, "office")));
            grid.appendChild(cell(createInput(row.fax, "fax")));
            grid.appendChild(cell(createInput(row.email, "email")));
            grid.appendChild(cell(createInput(row.website, "website")));

            // Delete Icon
            const deleteBtn = document.createElement("button");

            deleteBtn.innerHTML = "🗑";
            deleteBtn.title = "Delete Contact";

            deleteBtn.style.border = "none";
            deleteBtn.style.background = "transparent";
            deleteBtn.style.cursor = "pointer";
            deleteBtn.style.fontSize = "18px";
            deleteBtn.style.color = "#d13438";
            deleteBtn.style.padding = "4px";

            deleteBtn.onmouseenter = () => {
                deleteBtn.style.transform = "scale(1.15)";
            };

            deleteBtn.onmouseleave = () => {
                deleteBtn.style.transform = "scale(1)";
            };

            deleteBtn.onclick = () => {

                if (confirm("Delete this contact?")) {

                    this.contacts.splice(idx, 1);

                    this.renderGrid();
                    this.notifyOutputChanged();
                }
            };

            grid.appendChild(cell(deleteBtn));
        });

        this.gridRef.appendChild(grid);
    }

    private addRow(email: string = "", mobile: string = ""): void {

        this.contacts.push({
            id: Date.now(),
            contactType: "Primary",
            mobile: mobile,
            office: "",
            fax: "",
            email: email,
            website: ""
        });

        this.renderGrid();
        this.notifyOutputChanged();
    }

    public getOutputs(): IOutputs {

        return {
            contactlist: JSON.stringify(this.contacts)
        };
    }

    public destroy(): void {
        // Cleanup
    }
}