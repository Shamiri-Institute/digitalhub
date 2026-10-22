---- MODULE AttendancePayout ----
EXTENDS Integers, Sequences, Naturals

CONSTANTS Rates, MaxStmts, UnmarkByNet

ASSUME Rates \subseteq Nat
ASSUME MaxStmts \in Nat /\ MaxStmts >= 4
ASSUME UnmarkByNet \in BOOLEAN

Reason == {"MARK_SESSION_ATTENDANCE", "UNMARK_SESSION_ATTENDANCE"}

VARIABLES attended, processed, rate, stmts

vars == <<attended, processed, rate, stmts>>

RECURSIVE Sum(_, _)
Sum(s, i) ==
  IF i = 0 THEN 0
  ELSE Sum(s, i - 1) + s[i].amount

Net == Sum(stmts, Len(stmts))

Latest ==
  IF stmts = <<>> THEN "NONE"
  ELSE stmts[Len(stmts)].reason

CanAppend == Len(stmts) < MaxStmts

Init ==
  /\ attended = "none"
  /\ processed = FALSE
  /\ rate \in Rates
  /\ stmts = <<>>

ChangeRate(r) ==
  /\ r \in Rates
  /\ r /= rate
  /\ rate' = r
  /\ UNCHANGED <<attended, processed, stmts>>

CreateAttendance(wantMarked) ==
  /\ attended = "none"
  /\ ~processed
  /\ IF wantMarked
     THEN /\ CanAppend
          /\ attended' = "marked"
          /\ stmts' = Append(stmts, [amount |-> rate, reason |-> "MARK_SESSION_ATTENDANCE"])
     ELSE /\ attended' = "missed"
          /\ stmts' = stmts
  /\ UNCHANGED <<rate, processed>>

SetAttendance(wantMarked) ==
  /\ attended \in {"marked", "missed"}
  /\ ~processed
  /\ LET paid == Net
         change ==
           IF wantMarked
           THEN IF Latest = "MARK_SESSION_ATTENDANCE" THEN "none" ELSE "mark"
           ELSE IF Latest \in {"NONE", "UNMARK_SESSION_ATTENDANCE"} THEN "none" ELSE "unmark"
         unmarkAmount ==
           IF UnmarkByNet
           THEN IF paid = 0 THEN 0 ELSE -paid
           ELSE IF rate = 0 THEN 0 ELSE -rate
     IN /\ attended' = IF wantMarked THEN "marked" ELSE "missed"
        /\ IF change = "none"
           THEN stmts' = stmts
           ELSE /\ CanAppend
                /\ stmts' =
                     IF change = "mark"
                     THEN Append(stmts, [amount |-> rate, reason |-> "MARK_SESSION_ATTENDANCE"])
                     ELSE Append(stmts, [amount |-> unmarkAmount, reason |-> "UNMARK_SESSION_ATTENDANCE"])
  /\ UNCHANGED <<rate, processed>>

TriggerPayout ==
  /\ attended = "marked"
  /\ ~processed
  /\ Len(stmts) > 0
  /\ processed' = TRUE
  /\ UNCHANGED <<attended, rate, stmts>>

Next ==
  \/ \E r \in Rates : ChangeRate(r)
  \/ \E want \in BOOLEAN : CreateAttendance(want)
  \/ \E want \in BOOLEAN : SetAttendance(want)
  \/ TriggerPayout

Spec == Init /\ [][Next]_vars

TypeOk ==
  /\ attended \in {"none", "marked", "missed"}
  /\ processed \in BOOLEAN
  /\ rate \in Rates
  /\ Len(stmts) <= MaxStmts
  /\ \A i \in 1..Len(stmts) :
       /\ stmts[i].reason \in Reason
       /\ stmts[i].amount \in Int

Balance ==
  LET paid == Net IN
  IF attended = "marked"
  THEN /\ Latest = "MARK_SESSION_ATTENDANCE"
       /\ paid = stmts[Len(stmts)].amount
       /\ paid >= 0
  ELSE paid = 0

====
