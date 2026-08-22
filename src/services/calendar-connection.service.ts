import CalendarConnection from '../models/calendar-connection.model';

export const isGoogleCalendarConnected = async (userId: number) =>
  (await CalendarConnection.count({
    where: { user_id: userId, status: 'ACTIVE' },
  })) > 0;
