"""API-Definition EduKSX-Time. Eigene Zeiten unter /api/v1/me/…, Verwaltung und Team unter /api/v1/org/…"""

M, O = "/api/v1/me", "/api/v1/org"


def R(tabelle, schema, op, op_mehrzahl, einzahl, mehrzahl, basis, **kw):
    return {"tabelle": tabelle, "schema": schema, "op": op, "op_mehrzahl": op_mehrzahl, "einzahl": einzahl, "mehrzahl": mehrzahl,
            "pfad": f"{basis}/{kw.pop('pfad', tabelle.replace('_', '-'))}", **kw}


BUCHUNG = "enum:clock_in=Kommen;break_start=Pause;break_end=Pause beendet;clock_out=Gehen"

API = {
    "titel": "EduKSX-Time",
    "beschreibung": "Zeiterfassung: Stempeln (Kommen, Pause, Gehen) mit Buchungsart, Soll aus dem Pensum, Ist und Saldo mit gesetzlicher "
                    "Pause, Rückgängig, Nachtragen und Offline-Übertragung (idempotent über die Buchungs-ID). Ausbau: Abwesenheiten, "
                    "Korrekturen, Monatsabschluss mit Visum.",
    "tags": {
        "bookings": "Stempeln", "days": "Tage und Verlauf", "absences": "Abwesenheiten", "booking-corrections": "Korrekturen",
        "month-closings": "Monatsabschluss und Visum", "working-time-rules": "Arbeitszeitregeln", "booking-types": "Buchungsarten", "work-schedules": "Arbeitsmodelle",
    },
    "ressourcen": [
        R("absences", "Absence", "MyAbsence", "MyAbsences", "Abwesenheit", "Abwesenheiten", M, filter=["status", "valid_from"], artikel="eine", nur_lesen=["user_id", "status", "approved_by_id"]),
        R("booking_corrections", "BookingCorrection", "MyBookingCorrection", "MyBookingCorrections", "Korrekturantrag", "Korrekturanträge", M, filter=["status"], ops="lcr", artikel="einen",
          nur_lesen=["user_id", "status", "decided_by_id", "decided_at"]),
        R("working_time_rules", "WorkingTimeRule", "WorkingTimeRule", "WorkingTimeRules", "Arbeitszeitregel", "Arbeitszeitregeln", O, ops="lcr", artikel="eine"),
        R("booking_types", "BookingType", "BookingType", "BookingTypes", "Buchungsart", "Buchungsarten", O, ops="lcru", artikel="eine"),
        R("work_schedules", "WorkSchedule", "WorkSchedule", "WorkSchedules", "Arbeitsmodell", "Arbeitsmodelle", O, filter=["user_id"], ops="lcru"),
    ],
    "schemas": {
        "Status": {"title": "Status", "description": "aktueller Zustand für die Startseite",
                   "felder": {"state": ("enum:out=ausgestempelt;in=eingestempelt;on_break=Pause;forgotten=Gehen vergessen", "Zustand", "aus der letzten Buchung"),
                              "since": ("datetime?", "Seit", "letzte Buchung"), "booking_type_key": ("text?", "Buchungsart", "aktuell"),
                              "person": ("ref:PersonSummary", "Person", "Name, Funktion, Pensum"), "today": ("ref:Day", "Heute", "Tageswerte"),
                              "undo_until": ("datetime?", "Rückgängig bis", "letzte Buchung zurücknehmen"), "target_reached_at": ("datetime?", "Soll erreicht um", "voraussichtlich, inkl. gesetzlicher Pause")}},
        "PersonSummary": {"title": "Person", "description": "Kopf der App",
                          "felder": {"display_name": ("text", "Name", "aus der Personenreferenz"), "job_title": ("text?", "Funktion", "Arbeitsmodell"), "workload_percent": ("decimal", "Pensum", "in Prozent")}},
        "Booking": {"title": "Buchung", "description": "Stempelbuchung; die ID erzeugt das Gerät, erneutes Senden ist wirkungslos",
                    "felder": {"id": ("uuid", "ID", "vom Gerät erzeugt (UUID)"), "booking_kind": (BUCHUNG, "Buchung", "Stempeltaste"), "booked_at": ("datetime", "Zeitpunkt", "Zeit der Buchung"),
                               "booking_type_key": ("text", "Buchungsart", "z. B. «home_office»"), "is_backdated": ("bool!", "Nachgetragen", "vergessenes Gehen"),
                               "is_offline": ("bool", "Offline erfasst", "ohne Verbindung"), "recorded_at": ("datetime", "Erfasst am (Gerät)", "Zeit auf dem Gerät"),
                               "received_at": ("datetime!", "Übertragen am", "Eingang auf dem Server"), "cancelled_at": ("datetime?!", "Storniert am", "rückgängig gemacht"),
                               "remark": ("text?", "Bemerkung", "Freitext")},
                    "pflicht": ["id", "booking_kind", "booked_at", "booking_type_key", "recorded_at"]},
        "Day": {"title": "Tag", "description": "Tageswerte (berechnet)",
                "felder": {"work_on": ("date", "Arbeitstag", "Datum"), "target_minutes": ("int", "Soll (Minuten)", "aus dem Arbeitsmodell"), "actual_minutes": ("int", "Ist (Minuten)", "ohne gesetzliche Pause"),
                           "balance_minutes": ("int", "Saldo (Minuten)", "Ist minus Soll"), "break_taken_minutes": ("int", "Pausen (Minuten)", "gestempelt"),
                           "legal_break_minutes": ("int", "Gesetzliche Pause (Minuten)", "nicht gestempelter Rest"), "is_open": ("bool", "Offen", "ohne Gehen"),
                           "bookings": ("list:ref:Booking", "Buchungen", "Tagesliste"), "absence_label": ("text?", "Abwesenheit", "falls vorhanden")}},
        "History": {"title": "Verlauf", "description": "Zeitraum mit Tageswerten",
                    "felder": {"valid_from": ("date", "Von", "Beginn"), "valid_until": ("date", "Bis", "Ende"), "days": ("list:ref:Day", "Tage", "je Arbeitstag"),
                               "target_minutes": ("int", "Soll (Minuten)", "Summe"), "actual_minutes": ("int", "Ist (Minuten)", "Summe"), "balance_minutes": ("int", "Saldo (Minuten)", "Summe")}},
        "BookingBatch": {"title": "Übertragung", "description": "offline erfasste Buchungen auf einmal", "felder": {"bookings": ("list:ref:Booking", "Buchungen", "in zeitlicher Reihenfolge")}, "pflicht": ["bookings"]},
        "BookingBatchResult": {"title": "Ergebnis der Übertragung", "description": "angenommen, schon vorhanden oder abgelehnt",
                               "felder": {"accepted_ids": ("list:uuid", "Angenommen", "neu gespeichert"), "existing_ids": ("list:uuid", "Schon vorhanden", "gleiche ID"),
                                          "rejected": ("list:object", "Abgelehnt", "ID und Grund")}},
        "ClockOutBackdate": {"title": "Gehen nachtragen", "description": "vergessenes Gehen nachtragen (gekennzeichnet)",
                             "felder": {"id": ("uuid", "ID", "vom Gerät erzeugt"), "booked_at": ("datetime", "Zeitpunkt", "wann gegangen"), "remark": ("text?", "Bemerkung", "Freitext")}, "pflicht": ["id", "booked_at"]},
        "Decision": {"title": "Entscheid", "description": "Antrag bestätigen oder ablehnen", "felder": {"is_approved": ("bool", "Bestätigt", "ja oder nein"), "remark": ("text?", "Bemerkung", "Freitext")}, "pflicht": ["is_approved"]},
        "MonthClosing": {"title": "Monat", "description": "Monatsübersicht und Abschluss",
                         "felder": {"month": ("text", "Monat", "JJJJ-MM"), "user_id": ("uuid", "Person", "Verweis"), "target_minutes": ("int", "Soll (Minuten)", "Monat"), "actual_minutes": ("int", "Ist (Minuten)", "Monat"),
                                    "absence_minutes": ("int", "Abwesenheit (Minuten)", "angerechnet"), "balance_minutes": ("int", "Saldo Monat (Minuten)", "Ist minus Soll"),
                                    "carried_balance_minutes": ("int", "Saldovortrag (Minuten)", "Vormonat"), "total_balance_minutes": ("int", "Saldo total (Minuten)", "Vortrag plus Monat"),
                                    "vacation_taken_days": ("decimal", "Ferien bezogen (Tage)", "Monat"), "vacation_remaining_days": ("decimal?", "Ferien Rest (Tage)", "nach dem Monat"),
                                    "status": ("enum:open=offen;submitted=eingereicht;approved=visiert;returned=zurückgewiesen", "Status", "Abschluss"),
                                    "submitted_at": ("datetime?", "Eingereicht am", "Zeitpunkt"), "approved_at": ("datetime?", "Visiert am", "Zeitpunkt")}},
        "MonthApproval": {"title": "Visum", "description": "Monat visieren oder zurückweisen",
                          "felder": {"user_id": ("uuid", "Person", "Mitarbeiterin bzw. Mitarbeiter"), "is_approved": ("bool", "Visiert", "ja oder nein"),
                                     "remark": ("text?", "Bemerkung", "Freitext"), "with_signature": ("bool", "Mit Signatur", "über EduKSX-Sign")}, "pflicht": ["user_id", "is_approved"]},
        "MonthEvent": {"title": "Ereignis Monat", "description": "Monat eingereicht oder visiert",
                       "felder": {"user_id": ("uuid", "Person", "Verweis"), "month": ("text", "Monat", "JJJJ-MM"),
                                  "status": ("enum:submitted=eingereicht;approved=visiert;returned=zurückgewiesen", "Status", "Abschluss"), "total_balance_minutes": ("int", "Saldo total (Minuten)", "nach dem Monat")}},
    },
    "aktionen": [
        {"pfad": f"{M}/status", "methode": "get", "op": "getMyStatus", "summary": "Aktueller Zustand, heute Ist, Soll und Saldo", "ressource": "bookings", "antwort": "Status", "klassen": ["personal"], "fehler": ("401", "403")},
        {"pfad": f"{M}/bookings", "op": "createMyBooking", "summary": "Stempeln (Kommen, Pause, Pause beenden, Gehen)", "ressource": "bookings",
         "beschreibung": "Prüft Reihenfolge und Zeit; gleiche ID → keine zweite Buchung.", "body": "Booking", "antwort": "Status", "code": "201", "klassen": ["personal"]},
        {"pfad": f"{M}/bookings/batch", "op": "transferMyBookings", "summary": "Offline erfasste Buchungen übertragen", "ressource": "bookings", "body": "BookingBatch", "antwort": "BookingBatchResult", "klassen": ["personal"]},
        {"pfad": f"{M}/bookings/{{id}}/cancellation", "op": "undoMyBooking", "summary": "Letzte Buchung innerhalb der Frist rückgängig machen", "ressource": "bookings", "antwort": "Status", "klassen": ["personal"]},
        {"pfad": f"{M}/bookings/clock-out-backdate", "op": "backdateMyClockOut", "summary": "Vergessenes Gehen nachtragen", "ressource": "bookings", "body": "ClockOutBackdate", "antwort": "Status", "code": "201", "klassen": ["personal"]},
        {"pfad": f"{M}/days/{{date}}", "methode": "get", "op": "getMyDay", "summary": "Tageswerte und Buchungen", "ressource": "days", "pfadparam": {"date": ("Arbeitstag", "Datum (ISO 8601)", "2027-08-23")},
         "antwort": "Day", "klassen": ["personal"], "fehler": ("401", "403", "404")},
        {"pfad": f"{M}/history", "methode": "get", "op": "getMyHistory", "summary": "Woche bzw. letzte 14 Tage", "ressource": "days",
         "query": [("valid_from", "date", "Von", "Beginn"), ("valid_until", "date", "Bis", "Ende")], "antwort": "History", "klassen": ["personal"], "fehler": ("401", "403", "422")},
        {"pfad": f"{M}/month-closings/{{month}}", "methode": "get", "op": "getMyMonth", "summary": "Monatsübersicht mit Saldo und Ferien", "ressource": "month-closings",
         "pfadparam": {"month": ("Monat", "JJJJ-MM", "2027-11")}, "antwort": "MonthClosing", "klassen": ["personal"], "fehler": ("401", "403", "404")},
        {"pfad": f"{M}/month-closings/{{month}}/submission", "op": "submitMyMonth", "summary": "Monat einreichen", "ressource": "month-closings", "beschreibung": "Werte werden eingefroren.",
         "pfadparam": {"month": ("Monat", "JJJJ-MM", "2027-11")}, "antwort": "MonthClosing", "klassen": ["personal"]},
        {"pfad": f"{O}/month-closings", "methode": "get", "op": "listTeamMonths", "summary": "Monate des Teams zum Visieren", "ressource": "month-closings",
         "query": [("month", "text", "Monat", "JJJJ-MM"), ("status", "text", "Status", "z. B. submitted")], "antwort": "liste:MonthClosing", "klassen": ["personal"], "fehler": ("401", "403", "422")},
        {"pfad": f"{O}/month-closings/{{month}}/approval", "op": "approveMonth", "summary": "Monat visieren oder zurückweisen", "ressource": "month-closings", "recht": "admin",
         "pfadparam": {"month": ("Monat", "JJJJ-MM", "2027-11")}, "body": "MonthApproval", "antwort": "MonthClosing", "klassen": ["personal"]},
        {"pfad": f"{O}/booking-corrections/{{id}}/decision", "op": "decideBookingCorrection", "summary": "Korrektur bestätigen oder ablehnen", "ressource": "booking-corrections", "recht": "admin",
         "body": "Decision", "antwort": "BookingCorrection", "klassen": ["personal"]},
        {"pfad": f"{O}/absences/{{id}}/decision", "op": "decideAbsence", "summary": "Abwesenheit bewilligen oder ablehnen", "ressource": "absences", "recht": "admin",
         "body": "Decision", "antwort": "Absence", "klassen": ["sensitive"]},
    ],
    "ereignisse": {"time.month_closing.changed": ("MonthEvent", "Monat eingereicht oder visiert (für Lohn und Personal über EduKSX-Connect, EduKSX-Flow)")},
}
