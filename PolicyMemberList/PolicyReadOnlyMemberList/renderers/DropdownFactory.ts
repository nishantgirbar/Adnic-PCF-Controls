export class DropdownFactory {

public static create(
    options: any[],
    value: string,
    readOnly: boolean,
    required: boolean,
    onChange: (value: string) => void
): HTMLSelectElement {

    const select =
        document.createElement("select");

    select.className =
        "dropdown";

    select.disabled =
        readOnly;

    // Only show Select when value is empty
    if (!value) {

        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";
        defaultOption.text = "Select";

        select.appendChild(defaultOption);
    }

    if (
    value &&
    !options.some(o => o.value === value)
    ) {
        options = [
            { value: value, label: value },
            ...options
        ];
    }

    options.forEach(o => {

        const option =
            document.createElement("option");

        option.value =
            o.value;

        option.text =
            o.label;

        if (o.value === value) {
            option.selected = true;
        }

        select.appendChild(option);
    });

    if (
        required &&
        !value
    ) {
        select.classList.add(
            "required-dropdown"
        );
    }

    select.onchange = () => {

        if (
            required &&
            !select.value
        ) {
            select.classList.add(
                "required-dropdown"
            );
        }
        else {
            select.classList.remove(
                "required-dropdown"
            );
        }

        onChange(
            select.value
        );
    };

    return select;
}
}