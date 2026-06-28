import * as React from "react";
import {
    Stack,
    Text,
    Toggle,
    PrimaryButton,
    TextField
} from "@fluentui/react";

interface Props {
    apiUrl: string;
    onChange: (data: any[]) => void;
}

interface Question {
    id: number;
    question: string;
    displayOrder: number;
    answer: boolean;
    notes: string;
    fileName?: string;
}

const MedicalQuestionnaire: React.FC<Props> = ({ apiUrl, onChange }) => {

    const [questions, setQuestions] = React.useState<Question[]>([]);

    React.useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res = await fetch(apiUrl);
        const data = await res.json();

        const mapped: Question[] = data.medicalQuestions.map((q: any) => ({
            id: q.id,
            question: q.question,
            displayOrder: q.displayOrder,
            answer: false,
            notes: ""
        }));

        setQuestions(mapped);
        onChange(mapped);
    };

    const updateState = (updated: Question[]) => {
        setQuestions(updated);
        onChange(updated);
    };

    const onToggle = (id: number, checked?: boolean) => {
        const updated = questions.map(q =>
            q.id === id ? { ...q, answer: !!checked } : q
        );
        updateState(updated);
    };

    const updateNotes = (id: number, value?: string) => {
        const updated = questions.map(q =>
            q.id === id ? { ...q, notes: value || "" } : q
        );
        updateState(updated);
    };

    const uploadFile = async (id: number) => {
        const files = await (window as any).showOpenFilePicker?.();
        if (!files) return;

        const updated = questions.map(q =>
            q.id === id ? { ...q, fileName: "Uploaded" } : q
        );

        updateState(updated);
    };

    const sorted = [...questions].sort((a, b) => a.displayOrder - b.displayOrder);

    return (
        <Stack tokens={{ childrenGap: 10 }}>

            {sorted.map(q => (
                <Stack key={q.id}>

                    {/* 🔥 MAIN ROW */}
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "10px 0",
                        borderBottom: "1px solid #eee"
                    }}>

                        {/* Question */}
                        <div style={{ flex: 1, paddingRight: 10 }}>
                            <Text>{q.question}</Text>
                        </div>

                        {/* Toggle */}
                        <div style={{ width: 120, textAlign: "right" }}>
                            <Toggle
                                checked={q.answer}
                                onChange={(e, checked) => onToggle(q.id, checked)}
                                onText="Yes"
                                offText="No"
                            />
                        </div>

                    </div>

                    {/* 🔥 EXPAND BELOW */}
                    {q.answer && (
                        <div style={{
                            background: "#fafafa",
                            padding: "10px 20px",
                            borderBottom: "1px solid #eee"
                        }}>

                            <Stack tokens={{ childrenGap: 10 }}>

                                <PrimaryButton
                                    text={q.fileName || "Upload Document"}
                                    onClick={() => uploadFile(q.id)}
                                />

                                <TextField
                                    label="Remarks"
                                    value={q.notes}
                                    onChange={(e, val) => updateNotes(q.id, val)}
                                />

                            </Stack>

                        </div>
                    )}

                </Stack>
            ))}

        </Stack>
    );
};

export default MedicalQuestionnaire;