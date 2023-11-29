"use client";
import { Button } from "#/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import { Textarea } from "#/components/ui/textarea";
import { useState } from "react";

const history = [
  {
    id: 1,
    date: "20/11/2023",
    referredFrom: "Supervisor",
    referredTo: "Clinical",
  },
  {
    id: 2,
    date: "23/11/2023",
    referredFrom: "Fellow",
    referredTo: "Supervisor",
  },
  {
    id: 3,
    date: "24/11/2023",
    referredFrom: "Clinical",
    referredTo: "Supervisor",
  },
];

export function ReferralDetails() {
  const [referredFromSelected, setReferredFromSelected] = useState("");
  const [referredToSelected, setReferredToSelected] = useState("");

  const handleReferredFrom = (option: string) => {
    // TODO: API CALL
    setReferredFromSelected(option);
  };

  const handleReferredTo = (option: string) => {
    // TODO: API CALL
    setReferredToSelected(option);
  };

  return (
    <div className="mt-2 flex flex-col gap-5 px-1">
      <Select
        name="session"
        // defaultValue={fellow?.gender || field.value}
        // onValueChange={field.onChange}
      >
        <SelectTrigger>
          <SelectValue
            className="text-muted-foreground"
            // onChange={(val) => handleReferredFrom(field.value)}
            placeholder={
              <span className="text-muted-foreground">Referred from</span>
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="Fellow">Fellow</SelectItem>
          <SelectItem value="Self">Self Referral</SelectItem>
          <SelectItem value="Teacher">Teacher</SelectItem>
          <SelectItem value="Supervisor">Supervisor</SelectItem>
          <SelectItem value="AnotherStudent">Another Student</SelectItem>
        </SelectContent>
      </Select>
      <Select
        name="session"
        // defaultValue={fellow?.gender || field.value}
        // onValueChange={field.onChange}
      >
        <SelectTrigger>
          <SelectValue
            className="text-muted-foreground"
            // defaultValue={fellow?.gender || field.value}
            // onChange={field.onChange}
            placeholder={
              <span className="text-muted-foreground">Referred to</span>
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="DrW">Dr Wasanga</SelectItem>
          <SelectItem value="Exp 2">Expert 2</SelectItem>
          <SelectItem value="Exp 3">Expert 3</SelectItem>
          <SelectItem value="Exp 4">Expert 4</SelectItem>
          <SelectItem value="Exp 5">Expert 5</SelectItem>
        </SelectContent>
      </Select>
      <Select
        name="session"
        // defaultValue={fellow?.gender || field.value}
        // onValueChange={field.onChange}
      >
        <SelectTrigger>
          <SelectValue
            className="text-muted-foreground"
            // defaultValue={fellow?.gender || field.value}
            // onChange={field.onChange}
            placeholder={
              <span className="text-muted-foreground">
                Supervisor A or ECP write-in
              </span>
            }
          />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="DrW">Dr Wasanga</SelectItem>
          <SelectItem value="Exp 2">Expert 2</SelectItem>
          <SelectItem value="Exp 3">Expert 3</SelectItem>
          <SelectItem value="Exp 4">Expert 4</SelectItem>
          <SelectItem value="Exp 5">Expert 5</SelectItem>
        </SelectContent>
      </Select>

      <div>
        <Textarea
          id="note"
          name="note"
          // onChange={field.onChange}
          // defaultValue={field.value}
          placeholder="Write referral notes here..."
          className="mt-1.5 resize-none bg-card"
        />
      </div>

      <Button variant="brand">Submit Referral</Button>

      <div>
        <h3 className="mb-2 text-sm font-semibold text-brand">History</h3>

        <ul>
          {history.map((his, i) => (
            <SingleHistory
              key={his.id}
              date={his.date}
              referredFrom={his.referredFrom}
              referredTo={his.referredTo}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

function SingleHistory({
  date,
  referredFrom,
  referredTo,
}: {
  date: string;
  referredFrom: string;
  referredTo: string;
}) {
  return (
    <li>
      <p className="mb-2 ml-2 text-xs text-brand">
        {date} - Referred from {referredFrom} to {referredTo}.
      </p>
    </li>
  );
}
