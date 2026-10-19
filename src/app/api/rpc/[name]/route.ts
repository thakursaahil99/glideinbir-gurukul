import { isRedirectError } from "next/dist/client/components/redirect-error";
import { NextResponse } from "next/server";
import {
  changePasswordAction,
  createUserAction,
  deleteUserAction,
  resetSectionAction,
  saveSectionAction,
  updateUserAction,
} from "@/core/admin/actions";
import { adjustWalletAction } from "@/core/admin/wallet-actions";
import { markReadAction } from "@/core/notifications/actions";
import { cancelRechargeAction, confirmDemoRechargeAction, createRechargeOrderAction, verifyRechargeAction } from "@/core/payments/actions";
import { changeMyPasswordAction, updateProfileAction } from "@/core/profile/actions";
import {
  checkTestsAction,
  createProblemAction,
  deleteCommentAction,
  deleteProblemAction,
  loadDemoProblemsAction,
  mySubmissionsAction,
  postCommentAction,
  runCodeAction,
  saveProblemAction,
  setProblemStatusAction,
  submitCodeAction,
} from "@/modules/code/actions";
import { buyCourseAction, saveProgressAction, submitReviewAction } from "@/modules/courses/actions";
import { adminSetCourseStatusAction, loadDemoCoursesAction, saveCommissionAction } from "@/modules/courses/admin-actions";
import { createCourseAction, deleteCourseAction, saveCourseAction, setCourseStatusAction } from "@/modules/courses/teach-actions";
import {
  acceptDoubtAction,
  askDoubtAction,
  cancelDoubtAction,
  endDoubtAction,
  getDoubtAction,
  rateDoubtAction,
  saveDoubtCommissionAction,
  saveTutorProfileAction,
  sendMessageAction,
  setOnlineAction,
  startSessionAction,
  tutorFeedAction,
  videoLinkAction,
} from "@/modules/doubts/actions";
import {
  applyAction,
  createAlertAction,
  createPostingAction,
  deleteAlertAction,
  deletePostingAction,
  moderatePostingAction,
  moveStageAction,
  registerCompanyAction,
  reviewCompanyAction,
  savePostingAction,
  saveProfileAction,
  searchJobsAction,
  setPostingStatusAction,
  syncExternalAction,
  toggleSaveAction,
  updateCompanyAction,
  withdrawAction,
} from "@/modules/jobs/actions";
import {
  adminCancelBookingAction,
  bookSessionAction,
  cancelBookingAction,
  getBookingAction,
  joinCallAction,
  mentorSlotsAction,
  rescheduleBookingAction,
  saveMentorProfileAction,
  saveMentorshipCommissionAction,
  sessionFeedbackAction,
} from "@/modules/mentorship/actions";
import {
  applyVendorAction,
  buyNoteAction,
  createNoteAction,
  decidePayoutAction,
  deleteNoteAction,
  downloadLinkAction,
  loadDemoNotesAction,
  moderateNoteAction,
  reportNoteAction,
  requestPayoutAction,
  reviewNoteAction,
  reviewVendorAction,
  saveNoteAction,
  saveNotesSettingsAction,
  setNoteStatusAction,
  updateVendorAction,
} from "@/modules/notes/actions";
import { buyTestAction, saveAnswerAction, startAttemptAction, submitAttemptAction } from "@/modules/tests/actions";
import { adminSetTestStatusAction, loadDemoTestsAction, saveTestCommissionAction } from "@/modules/tests/admin-actions";
import { createTestAction, deleteTestAction, saveTestAction, setTestStatusAction } from "@/modules/tests/teach-actions";

/**
 * JSON RPC for client-side mutations: POST /api/rpc/<name> with a JSON array of args.
 *
 * Why not call the server actions directly? In this app, the client side of server
 * actions intermittently never resolved (the response arrived in full, but the action
 * promise stayed pending and buttons hung). Plain route handlers have been 100% reliable,
 * so the client calls the very same functions through here. Each function still does its
 * own auth (requireUser/requireAdmin) and zod validation.
 */
const HANDLERS = {
  "wallet.createOrder": createRechargeOrderAction,
  "wallet.verify": verifyRechargeAction,
  "wallet.confirmDemo": confirmDemoRechargeAction,
  "wallet.cancel": cancelRechargeAction,
  "notifications.markRead": markReadAction,
  "profile.update": updateProfileAction,
  "profile.password": changeMyPasswordAction,
  "admin.adjustWallet": adjustWalletAction,
  "admin.saveSection": saveSectionAction,
  "admin.resetSection": resetSectionAction,
  "admin.changePassword": changePasswordAction,
  "admin.createUser": createUserAction,
  "admin.updateUser": updateUserAction,
  "admin.deleteUser": deleteUserAction,
  "courses.buy": buyCourseAction,
  "courses.progress": saveProgressAction,
  "courses.review": submitReviewAction,
  "teach.create": createCourseAction,
  "teach.save": saveCourseAction,
  "teach.status": setCourseStatusAction,
  "teach.delete": deleteCourseAction,
  "admin.courseStatus": adminSetCourseStatusAction,
  "admin.commission": saveCommissionAction,
  "admin.loadDemo": loadDemoCoursesAction,
  "tests.buy": buyTestAction,
  "tests.start": startAttemptAction,
  "tests.answer": saveAnswerAction,
  "tests.submit": submitAttemptAction,
  "testsTeach.create": createTestAction,
  "testsTeach.save": saveTestAction,
  "testsTeach.status": setTestStatusAction,
  "testsTeach.delete": deleteTestAction,
  "testsAdmin.status": adminSetTestStatusAction,
  "testsAdmin.commission": saveTestCommissionAction,
  "testsAdmin.loadDemo": loadDemoTestsAction,
  "doubts.ask": askDoubtAction,
  "doubts.get": getDoubtAction,
  "doubts.cancel": cancelDoubtAction,
  "doubts.end": endDoubtAction,
  "doubts.message": sendMessageAction,
  "doubts.rate": rateDoubtAction,
  "doubts.video": videoLinkAction,
  "doubtsTutor.profile": saveTutorProfileAction,
  "doubtsTutor.online": setOnlineAction,
  "doubtsTutor.feed": tutorFeedAction,
  "doubtsTutor.accept": acceptDoubtAction,
  "doubtsTutor.start": startSessionAction,
  "doubtsAdmin.commission": saveDoubtCommissionAction,
  "mentorship.slots": mentorSlotsAction,
  "mentorship.book": bookSessionAction,
  "mentorship.cancel": cancelBookingAction,
  "mentorship.reschedule": rescheduleBookingAction,
  "mentorship.feedback": sessionFeedbackAction,
  "mentorship.join": joinCallAction,
  "mentorship.get": getBookingAction,
  "mentorStudio.save": saveMentorProfileAction,
  "mentorshipAdmin.commission": saveMentorshipCommissionAction,
  "mentorshipAdmin.cancel": adminCancelBookingAction,
  "notes.buy": buyNoteAction,
  "notes.download": downloadLinkAction,
  "notes.review": reviewNoteAction,
  "notes.report": reportNoteAction,
  "notesSell.apply": applyVendorAction,
  "notesSell.updateStore": updateVendorAction,
  "notesSell.create": createNoteAction,
  "notesSell.save": saveNoteAction,
  "notesSell.status": setNoteStatusAction,
  "notesSell.delete": deleteNoteAction,
  "notesSell.payout": requestPayoutAction,
  "notesAdmin.vendor": reviewVendorAction,
  "notesAdmin.moderate": moderateNoteAction,
  "notesAdmin.payout": decidePayoutAction,
  "notesAdmin.settings": saveNotesSettingsAction,
  "notesAdmin.loadDemo": loadDemoNotesAction,
  "code.run": runCodeAction,
  "code.submit": submitCodeAction,
  "code.mine": mySubmissionsAction,
  "code.comment": postCommentAction,
  "code.deleteComment": deleteCommentAction,
  "codeAuthor.create": createProblemAction,
  "codeAuthor.save": saveProblemAction,
  "codeAuthor.status": setProblemStatusAction,
  "codeAuthor.delete": deleteProblemAction,
  "codeAuthor.check": checkTestsAction,
  "codeAdmin.loadDemo": loadDemoProblemsAction,
  "jobs.profile": saveProfileAction,
  "jobs.apply": applyAction,
  "jobs.withdraw": withdrawAction,
  "jobs.save": toggleSaveAction,
  "jobs.search": searchJobsAction,
  "jobs.alert": createAlertAction,
  "jobs.deleteAlert": deleteAlertAction,
  "recruit.company": registerCompanyAction,
  "recruit.updateCompany": updateCompanyAction,
  "recruit.create": createPostingAction,
  "recruit.save": savePostingAction,
  "recruit.status": setPostingStatusAction,
  "recruit.delete": deletePostingAction,
  "recruit.move": moveStageAction,
  "jobsAdmin.company": reviewCompanyAction,
  "jobsAdmin.moderate": moderatePostingAction,
  "jobsAdmin.sync": syncExternalAction,
} as const;

export type RpcName = keyof typeof HANDLERS;
export type RpcHandlers = typeof HANDLERS;

/** Same-origin only (server actions do this check for us; route handlers must do it themselves). */
function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ name: string }> }) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-site request blocked" }, { status: 403 });
  const { name } = await params;
  const handler = (HANDLERS as Record<string, (...args: unknown[]) => Promise<unknown>>)[name];
  if (!handler) return NextResponse.json({ error: "Unknown call" }, { status: 404 });

  let args: unknown;
  try {
    args = await req.json();
  } catch {
    return NextResponse.json({ error: "Bad JSON" }, { status: 400 });
  }
  if (!Array.isArray(args) || args.length > 3) return NextResponse.json({ error: "Bad arguments" }, { status: 400 });

  try {
    const result = await handler(...args);
    return NextResponse.json({ result: result ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    // requireUser()/requireAdmin() redirect when signed out or not allowed.
    if (isRedirectError(e)) return NextResponse.json({ error: "Please sign in again" }, { status: 401 });
    console.error(`[rpc] ${name} failed`, e);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
