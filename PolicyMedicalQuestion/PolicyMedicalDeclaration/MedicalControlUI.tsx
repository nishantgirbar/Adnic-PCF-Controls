import * as React from "react";
import {
    Stack,
    Text,
    Toggle,
    PrimaryButton,
    DefaultButton,
    TextField
} from "@fluentui/react";
import "./style.css";

interface Member {
    id: number;
    serialNo?: number;
    relation: string;
    gender: string;
    dob: string;
    salary: string;
    visa: string;
    category: string;
    marital: string;
    comments?: string;
    fileName?: string;
    error?: string;
}

interface Question {
    id: number;
    question: string;
    displayOrder?: number;
    answer: boolean;
    category: string;
}

interface Props {
    existingData: { medicalQuestions?: any[] };
    onChange: (data: any) => void;
}

const MedicalControlUI: React.FC<Props> = ({ existingData, onChange }) => {

    const [questions, setQuestions] = React.useState<Question[]>([]);
    const [members, setMembers] = React.useState<Member[]>([]);
    const fileRefs = React.useRef<Record<number, HTMLInputElement | null>>({});

    // ================= LOAD QUESTIONS =================
    React.useEffect(() => {
        if (existingData?.medicalQuestions) {
            const mapped = existingData.medicalQuestions.map((q: any) => ({
                id: q.id,
                question: q.question,
                answer: q.answer === "Yes",
                category: q.category || ""
            }));
            setQuestions(mapped);
            emitOutput(mapped);
        }
    }, [existingData]);

    const emitOutput = (qs: Question[]) => {
        onChange({
            medicalQuestions: qs.map(q => ({
                id: q.id,
                question: q.question,
                answer: q.answer ? "Yes" : "No",
                category: q.category
            }))
        });
    };

    const handleToggle = (id: number, checked?: boolean) => {
        const updated = questions.map(q =>
            q.id === id ? { ...q, answer: !!checked } : q
        );
        setQuestions(updated);
        emitOutput(updated);
    };

    // ================= ADD ROW =================
    const addRow = () => {
        setMembers(prev => [...prev, {
            id: Date.now(),
            relation: "",
            gender: "",
            dob: "",
            salary: "",
            visa: "",
            category: "",
            marital: ""
        }]);
    };

    // ================= SERIAL FIX =================
    const handleSerialChange = (id: number, value?: string) => {

        const serial = Number(value);
        let list: any[] = [];

        try {
            const raw = (window as any)?.Xrm?.Page
                ?.getAttribute("adnic_memberdata")
                ?.getValue();

            let parsed: any = raw;

            if (typeof raw === "string") {
                parsed = JSON.parse(raw);
            }

            // ✅ supports both {members:[]} and []
            list = Array.isArray(parsed) ? parsed : parsed?.members || [];

        } catch (e) {
            console.error("Parse error:", e);
            list = [];
        }

        setMembers(prev =>
            prev.map(m => {

                if (m.id !== id) return m;

                if (!value) {
                    return { ...m, serialNo: undefined, relation: "", gender: "", dob: "", salary: "", visa: "", category: "", marital: "", error: "" };
                }

                if (isNaN(serial) || serial <= 0) {
                    return { ...m, error: "Enter valid serial number" };
                }

                if (serial > list.length) {
                    return { ...m, error: "Serial number not found" };
                }

                const matched = list[serial - 1] || {};

                return {
                    ...m,
                    serialNo: serial,

                    // ✅ SAFE NESTED MAPPING
                    relation: matched?.relation?.displayName || matched?.relation?.code || "",
                    gender: matched?.gender || "",
                    dob: matched?.dateOfBirth || "",
                    salary: matched?.salaryType || "",
                    visa: matched?.visaLocation || "",
                    category: matched?.category || "",
                    marital: matched?.maritalStatus || "",
                    error: ""
                };
            })
        );
    };

    const updateComments = (id: number, val?: string) => {
        setMembers(prev =>
            prev.map(m => m.id === id ? { ...m, comments: val } : m)
        );
    };

    const handleUpload = (id: number, file: File) => {
        setMembers(prev =>
            prev.map(m => m.id === id ? { ...m, fileName: file.name } : m)
        );
    };

    const anyYes = questions.some(q => q.answer);

    return (
        <div className="medical-pcf">

            <Stack tokens={{ childrenGap: 15 }}>

                {questions.map(q => (
                    <div key={q.id}>
                        <div className="question-row">
                            <Text>{q.question}</Text>
                            <Toggle
                                checked={q.answer}
                                onChange={(e, c) => handleToggle(q.id, c)}
                                onText="Yes"
                                offText="No"
                            />
                        </div>
                    </div>
                ))}

                {anyYes && (
                    <div className="grid-wrapper">

                        <div className="grid-header">
                            <Text variant="mediumPlus">Medical Declared Members</Text>
                            <PrimaryButton text="Add Row" onClick={addRow} />
                        </div>

                        <div className="row header grid">
                            <div>Serial</div>
                            <div>Relation</div>
                            <div>Gender</div>
                            <div>DOB</div>
                            <div>Salary</div>
                            <div>Visa</div>
                            <div>Category</div>
                            <div>Marital</div>
                        </div>

                        {members.map(m => (
                            <div key={m.id} className="member-block">

                                <div className="row grid">

                                    <TextField
                                        value={m.serialNo?.toString()}
                                        errorMessage={m.error}
                                        onChange={(e, val) => handleSerialChange(m.id, val)}
                                    />

                                    <div>{m.relation}</div>
                                    <div>{m.gender}</div>
                                    <div>{m.dob}</div>
                                    <div>{m.salary}</div>
                                    <div>{m.visa}</div>
                                    <div>{m.category}</div>
                                    <div>{m.marital}</div>

                                </div>

                                <div className="row-details">

                                    <TextField
                                        placeholder="Comments"
                                        value={m.comments}
                                        onChange={(e, val) => updateComments(m.id, val)}
                                    />

                                    <input
                                        type="file"
                                        style={{ display: "none" }}
                                        ref={(el) => { fileRefs.current[m.id] = el; }}
                                        onChange={(e) => {
                                            const f = e.target.files?.[0];
                                            if (f) handleUpload(m.id, f);
                                        }}
                                    />

                                    <DefaultButton
                                        text={m.fileName || "Upload"}
                                        onClick={() => fileRefs.current[m.id]?.click()}
                                    />

                                </div>
                            </div>
                        ))}

                    </div>
                )}

            </Stack>
        </div>
    );
};

export default MedicalControlUI;