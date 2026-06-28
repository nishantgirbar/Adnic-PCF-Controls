import * as React from "react";

interface IDropdownOption {
    label: string;
    value: string;
}

interface DynamicDropdownProps {
    apiUrl: string;
    selectedValue?: string;
    onChange: (value: string) => void;
}

export const DynamicDropdown: React.FC<DynamicDropdownProps> = ({
    apiUrl,
    selectedValue,
    onChange
}) => {

    const [options, setOptions] = React.useState<IDropdownOption[]>([]);
    const [loading, setLoading] = React.useState(false);

    React.useEffect(() => {
        loadOptions();
    }, [apiUrl]);

    const loadOptions = async () => {
        try {
            if (!apiUrl) {
                console.error("API URL not configured");
                return;
            }

            setLoading(true);

            const response = await fetch(apiUrl, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            const dropdownOptions: IDropdownOption[] = data.map((item: any) => ({
                label:
                    item.name ||
                    item.label ||
                    item.providerName ||
                    item.text,
                value:
                    item.id ||
                    item.value ||
                    item.code
            }));

            setOptions(dropdownOptions);
        }
        catch (error) {
            console.error("Dropdown API Error", error);
        }
        finally {
            setLoading(false);
        }
    };

    return (
        <div className="dropdown-container">
            <select
                value={selectedValue || ""}
                onChange={(e) => onChange(e.target.value)}
                disabled={loading}
                style={{
                    width: "100%",
                    height: "35px",
                    borderRadius: "4px",
                    border: "1px solid #ccc"
                }}
            >
                <option value="">
                    {loading ? "Loading..." : "-- Select --"}
                </option>

                {options.map((option) => (
                    <option
                        key={option.value}
                        value={option.value}
                    >
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );
};